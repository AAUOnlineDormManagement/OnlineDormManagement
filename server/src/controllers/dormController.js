// src/controllers/dormController.js
const path = require('path');
const { createWorker, createScheduler } = require('tesseract.js');
const { initializeChapaPayment } = require('../utils/chapa');

// --- OCR Optimization: Shared Scheduler ---
let ocrScheduler = null;
let ocrInitPromise = null;

async function getOcrScheduler() {
  if (ocrScheduler) return ocrScheduler;
  if (ocrInitPromise) return ocrInitPromise;

  ocrInitPromise = (async () => {
    try {
      console.log('🏗️  Initializing OCR Singleton Scheduler (3 Workers)...');
      const tempScheduler = createScheduler();
      
      const p1 = createWorker('eng');
      const p2 = createWorker('eng');
      const p3 = createWorker('eng');
      
      // Use a longer timeout or just proceed with the workers
      const workers = await Promise.race([
        Promise.all([p1, p2, p3]),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SCHEDULER_WORKER_TIMEOUT')), 60000)
        )
      ]);
      
      workers.forEach(w => tempScheduler.addWorker(w));
      
      ocrScheduler = tempScheduler;
      console.log('✅ OCR Singleton Scheduler Ready with 3 Workers');
      return ocrScheduler;
    } catch (err) {
      console.warn('⚠️ OCR Scheduler initialization failed/timed out:', err.message);
      ocrScheduler = null;
      return null;
    } finally {
      ocrInitPromise = null;
    }
  })();

  return ocrInitPromise;
}

const DormApplication = require('../models/DormApplication');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Floor = require('../models/Floor');
const Notification = require('../models/Notification');
const DormApplicationWindow = require('../models/DormApplicationWindow');
const CampusDepartmentPolicy = require('../models/CampusDepartmentPolicy');
const DormApplicationConfig = require('../models/DormApplicationConfig');
const ADDIS_WAIT_MS = 3 * 60 * 1000;
const { normalizeFilePath } = require('../utils/fileNormalization');

function roomGenderFilter(gender) {
  return { $in: [gender, 'Mixed'] };
}

function campusMatcher(campus) {
  const normalized = String(campus || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return /.*/i;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`^${escaped}$`, 'i');
}

function normalizeToken(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCityCategoryFromBackText(backText) {
  const t = normalizeAscii(backText);
  if (!t) return 'other';
  if (t.includes('sheger')) return 'shager';
  if (t.includes('addisababa') || t.includes('addis') || t.includes('finfinne') || t.includes('finfine')) {
    return 'addis';
  }
  return 'other';
}

async function getEffectiveWaitMsForCityCategory(cityCategory, campus) {
  if (cityCategory !== 'addis' && cityCategory !== 'shager') return 0;
  // USER REQUIREMENT: Fixed 3 minutes for both Addis Ababa and Shager
  return 3 * 60 * 1000;
}
const { getCampusForDepartment } = require('../utils/campus');
const {
  normalizeAscii,
  extractAddressRegionFromBackOcr,
  cityMatchesBackOcr,
  cityImpliesAddis,
  backOcrImpliesAddisArea,
  impliesFarAddis,
  qualifiesForImmediateDorm,
} = require('../utils/fydaAddressMatch');

/** OCR: English only for reliability (FYDA English address lines; Amharic ignored for matching). */
async function tryOcrText(filePath, jobTimeout = 7500) {
  const start = Date.now();
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('OCR_TIMEOUT')), jobTimeout)
  );

  try {
    const jobPromise = (async () => {
      const scheduler = await getOcrScheduler();
      if (!scheduler) throw new Error('NO_SCHEDULER');
      const result = await scheduler.addJob('recognize', filePath);
      return result;
    })();

    const result = await Promise.race([jobPromise, timeoutPromise]);
    
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`✅ OCR finished in ${duration}s for ${path.basename(filePath)}`);
    return String(result?.data?.text || '');
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    if (err.message === 'OCR_TIMEOUT' || err.message === 'SCHEDULER_INIT_TIMEOUT' || err.message === 'NO_SCHEDULER') {
      console.warn(`⏳ OCR skipped after ${duration}s due to: ${err.message}`);
      throw new Error('OCR_TIMEOUT');
    }
    console.error(`❌ OCR Error after ${duration}s:`, err.message);
    return '';
  }
}

/** Student name on front: tolerate OCR noise while keeping identity checks meaningful. */
function nameLikelyOnId(fullName, ocrText) {
  const text = String(ocrText || '').toLowerCase();
  const tokens = String(fullName || '')
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z']/g, '').toLowerCase())
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return true;
  const hits = tokens.filter((t) => text.includes(t)).length;
  // OCR often misses one token; require roughly half of meaningful tokens.
  const need = Math.max(1, Math.ceil(tokens.length * 0.5));
  return hits >= need;
}

function normalizeDeclaredCity(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  // Common Addis spellings/typos users type
  const addisAliases = [
    'addis',
    'addisababa',
    'addisabeba',
    'adis',
    'adisababa',
    'adisabeba',
    'sheger',
    'finfinne',
    'finfine',
  ];
  if (addisAliases.some((a) => key.includes(a))) {
    return 'Addis Ababa';
  }
  return raw;
}

function isSelfSponsoredStudent(studentLike) {
  const raw = String(studentLike?.sponsorship || studentLike?.studentType || '').trim().toLowerCase();
  return raw.includes('self');
}

function citySuggestionFromBackOcr(backText) {
  if (!backText) return '';
  if (backOcrImpliesAddisArea(backText)) return 'Addis Ababa';

  // Best-effort human hint from OCR address region
  const region = extractAddressRegionFromBackOcr(backText);
  const words = (String(region).match(/[A-Za-z]{3,}/g) || []).slice(0, 3);
  return words.join(' ');
}

function strictCityMatchFromBackOcr(city, backText) {
  const rawCity = String(city || '').split(',')[0].trim();
  if (!rawCity || !backText) return false;

  // Addis-family values are validated by Addis indicators on back-side OCR.
  if (cityImpliesAddis(rawCity)) {
    return backOcrImpliesAddisArea(backText);
  }

  // For non-Addis cities, require direct match against extracted address region.
  const addrRegion = extractAddressRegionFromBackOcr(backText) || backText;
  const addrAscii = normalizeAscii(addrRegion);
  const cityAscii = normalizeAscii(rawCity);
  if (!addrAscii || !cityAscii) return false;

  if (addrAscii.includes(cityAscii)) return true;

  // Multi-word fallback: all substantial city tokens must appear.
  const parts = rawCity
    .split(/\s+/)
    .map((p) => normalizeAscii(p))
    .filter((p) => p.length >= 4);
  if (parts.length === 0) return false;
  return parts.every((p) => addrAscii.includes(p));
}

/**
 * Prefer a room on the student's faculty campus; fall back to any same-gender vacancy.
 */
async function findRoomForStudent(student, isSpecialNeed = false) {
  const gender = student.gender || student.user?.gender;
  if (!gender) {
    console.warn(`⚠️ Gender not found for student ${student._id}. Room search may fail.`);
  }

  const campus = getCampusForDepartment(student.department);
  let query = {
    gender: roomGenderFilter(gender),
    campus: { $regex: campusMatcher(campus) },
    capacity: { $gt: 0 },
    $expr: { $lt: ["$currentOccupants", "$capacity"] }
  };

  if (isSpecialNeed) {
    const firstFloors = await Floor.find({ floorNumber: 1 });
    query.floor = { $in: firstFloors.map((f) => f._id) };
  }

  let room = await Room.findOne(query).populate('building');
  if (room) return { room, isOverflow: false, campus };

  // Admin-controlled cross-campus acceptance by department.
  const policies = await CampusDepartmentPolicy.find({
    sourceDepartment: { $regex: campusMatcher(student.department) },
    isActive: true,
  }).select('targetCampus');

  const targetCampuses = [...new Set(policies.map((p) => String(p.targetCampus || '').trim()).filter(Boolean))];
  for (const targetCampus of targetCampuses) {
    if (normalizeToken(targetCampus) === normalizeToken(campus)) continue;
    const overflowQuery = {
      ...query,
      campus: { $regex: campusMatcher(targetCampus) },
    };
    room = await Room.findOne(overflowQuery).populate('building');
    if (room) return { room, isOverflow: true, campus: targetCampus };
  }

  // ULTIMATE FALLBACK: If no policies match or they are all full, find ANY available room matching gender.
  // If no preferred or overflow campus has vacancy, fall back to ANY available room matching gender.
  const anyQuery = {
    gender: roomGenderFilter(student.gender),
    capacity: { $gt: 0 },
    $expr: { $lt: ["$currentOccupants", "$capacity"] }
  };
  // For special‑need students, limit to first‑floor rooms as before.
  if (isSpecialNeed) {
    const firstFloors = await Floor.find({ floorNumber: 1 });
    anyQuery.floor = { $in: firstFloors.map((f) => f._id) };
  }
  const anyRoom = await Room.findOne(anyQuery).populate('building');
  if (anyRoom) return { room: anyRoom, isOverflow: true, campus: anyRoom.campus };

  return { room: null, isOverflow: false, campus };
}

async function assignStudentToRoom(application, student) {
  const { room, isOverflow, campus } = await findRoomForStudent(student, student.isSpecialNeed);
  if (!room) {
    application.status = 'Pending';
    application.originVerificationNote = `${application.originVerificationNote || ''} No vacant room found even after campus overflow search.`.trim();

    // Notify applicant when no bed is available (including capacity=0 rooms).
    try {
      const studentUser = student.user?._id || student.user;
      if (studentUser) {
        const existing = await Notification.findOne({
          user: studentUser,
          type: 'DormApplication',
          title: 'No beds available',
          'data.applicationId': String(application._id),
          read: false,
        });

        if (!existing) {
          await Notification.create({
            user: studentUser,
            type: 'DormApplication',
            title: 'No beds available',
            message: 'All room beds are currently full (or room capacity is 0). Your application is pending and you will be notified once a bed becomes available.',
            data: { applicationId: String(application._id) },
            isSent: true,
          });
        }
      }
    } catch (e) {
      console.error('Failed to send no-bed notification:', e.message);
    }

    return false;
  }

  application.assignedRoom = room._id;
  application.status = 'Assigned';
  
  if (isOverflow) {
    const note = `Assigned to ${campus || 'Alternative'} Campus due to full capacity at preferred location.`;
    application.originVerificationNote = `${application.originVerificationNote || ''} ${note}`.trim();
    
    // Notify the student regarding the campus shift
    try {
      const studentUser = student.user?._id || student.user; 
      if (studentUser) {
        await Notification.create({
          user: studentUser,
          type: 'DormApplication',
          title: '📍 Campus Allocation Adjust',
          message: `Important: Your preferred campus was at full capacity. You have been assigned to ${campus || 'an alternative campus'} to ensure you have housing.`,
          isSent: true
        });
      }
    } catch (e) {
      console.error('Failed to send overflow notification:', e.message);
    }
  }

  room.currentOccupants = (room.currentOccupants || 0) + 1;
  room.isFull = room.currentOccupants >= (room.capacity || 4);
  if (!room.assignedStudents) room.assignedStudents = [];
  room.assignedStudents.push(student._id);
  await room.save();
  return true;
}

const submitApplication = async (req, res) => {
  try {
    const globalConfig = await DormApplicationConfig.findOne({ key: 'global' });
    if (!globalConfig?.isOpen) {
      return res.status(403).json({
        success: false,
        message: 'Dorm application is currently closed by administration.',
      });
    }

    if (globalConfig?.openedAt && Date.now() < new Date(globalConfig.openedAt).getTime()) {
      const openDateStr = new Date(globalConfig.openedAt).toLocaleString();
      return res.status(403).json({
        success: false,
        message: `Dorm applications will open on ${openDateStr}. Please wait until then to apply.`,
      });
    }

    const { reason, isStaffRelated, isSpecialNeed } = req.body;
    const reasonStr = String(reason || 'Dorm placement request').trim();
    // CITY INPUT REMOVED: Detection is now automated via OCR

    const frontFile = req.files?.fydaFront?.[0] || req.files?.nationalIdFront?.[0];
    const backFile = req.files?.fydaBack?.[0] || req.files?.nationalIdBack?.[0];

    if (!frontFile || !backFile) {
      return res.status(400).json({ success: false, message: 'Please upload both front and back images of your ID (FYDA).' });
    }

    const student = await Student.findOne({ user: req.user._id }).populate('user');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Update student with checkbox values
    student.isStaffRelated = isStaffRelated === 'true' || isStaffRelated === true;
    student.isSpecialNeed = isSpecialNeed === 'true' || isSpecialNeed === true;
    await student.save();

    // === PARALLEL: OCR & Payment Initialization ===
    // Strict validation:
    // 1) Student name must match FYDA front OCR
    // 2) Declared city must match FYDA back OCR/address
    let backText = '';
    let frontText = '';
    let frontOcrTimedOut = false;
    let backOcrTimedOut = false;
    let paymentInfo = null;

    const parallelTasks = [
      (async () => {
        try {
          frontText = await tryOcrText(path.resolve(frontFile.path), 15000);
        } catch (ocrErr) {
          if (ocrErr.message === 'OCR_TIMEOUT') {
            frontOcrTimedOut = true;
          }
        }
      })(),
      (async () => {
        try {
          backText = await tryOcrText(path.resolve(backFile.path), 15000);
        } catch (ocrErr) {
          if (ocrErr.message === 'OCR_TIMEOUT') {
            backOcrTimedOut = true;
          }
        }
      })(),
    ];

    // NOTE: Chapa initialization is now DEFERRED until a room is found.

    // Wait for all processes to finish or timeout
    await Promise.all(parallelTasks);

    // === STRICT VERIFICATION LOGIC ===
    // === CITY DETECTION ===
    let finalCity = citySuggestionFromBackOcr(backText);
    if (!finalCity) {
      // If we can't detect a specific city, we fall back to a region check
      if (backOcrImpliesAddisArea(backText)) {
        finalCity = 'Addis Ababa';
      } else {
        // Highly restrictive: if we can't reliably read the city, we can't process
        return res.status(400).json({
          success: false,
          message: 'Could not reliably detect your city from the FYDA. Please ensure the back side is well-lit and clear.',
        });
      }
    }

    const nameMatches = nameLikelyOnId(student.user?.name, frontText);
    if (!nameMatches) {
      return res.status(400).json({
        success: false,
        message: 'Student name does not match the FYDA front-side text.',
      });
    }

    const cityCategory = detectCityCategoryFromBackText(backText);
    if (cityCategory === 'shager') finalCity = 'Shager';
    if (cityCategory === 'addis') finalCity = 'Addis Ababa';

    let verificationNote = `Automatically detected city: ${finalCity}`;

    const originVerified = true;

    const isAddis = cityCategory === 'addis' || cityCategory === 'shager';
    const isFar = impliesFarAddis(finalCity, backText);
    const studentCampus = getCampusForDepartment(student.department);
    const waitMs = await getEffectiveWaitMsForCityCategory(cityCategory, studentCampus);
    const isSelfSponsored = isSelfSponsoredStudent(student);
    
    let status = 'Pending';
    let scheduledReleaseAt = null;
    let paymentStatus = isSelfSponsored ? 'Pending' : 'NotRequired';

    let foundRoom = null;
    let foundCampus = null;

    // If staff-related OR special-need: require admin approval
    const needsAdminApproval = student.isStaffRelated || student.isSpecialNeed;

    if (needsAdminApproval) {
      // Staff-related or special need students require admin approval
      status = 'Pending';  // stays Pending until admin review
      paymentStatus = 'NotRequired';
    } else {
      // Normal flow for regular students (no staff/special need flags)
      if (isAddis) {
        // OCR-based city policy:
        // - Addis Ababa => 5 min default
        // - Shager => 3 min default
        // - If admin opened applications for campus, waits use window-linked minutes.
        status = 'Waiting';
        scheduledReleaseAt = new Date(Date.now() + waitMs);
        paymentStatus = isSelfSponsored ? 'Pending' : 'NotRequired';
      } else {
        // Outside Addis residents get immediate room check and assignment
        const { room, campus } = await findRoomForStudent(student, student.isSpecialNeed);
        if (room) {
          foundRoom = room;
          foundCampus = campus;
          if (isSelfSponsored) {
            status = 'PaymentPending';
            paymentStatus = 'Pending';
            try {
              paymentInfo = await initializeChapaPayment(student, 3000);
            } catch (e) {
              console.error('Chapa init failed:', e.message);
            }
          } else {
            // Government-sponsored non-Addis: assign immediately
            status = 'Assigned';
            paymentStatus = 'NotRequired';
          }
        } else {
          status = 'Pending'; 
        }
      }
    }

    let chapaPaymentUrl = paymentInfo?.checkout_url || null;
    let chapaTxRef = paymentInfo?.tx_ref || null;

    // Immediate assignment attempt only when not in Addis waiting window.

    // ==================== SAVE APPLICATION ====================
    const { persistFileToDb } = require('../utils/dbStorage');
    const normFront = normalizeFilePath(frontFile.path);
    const normBack = normalizeFilePath(backFile.path);
    
    // Background persist to DB for Vercel permanence
    persistFileToDb(frontFile.path).catch(() => {});
    persistFileToDb(backFile.path).catch(() => {});

    const appPayload = {
      student: student._id,
      reason: reasonStr,
      city: finalCity,
      nationalIdFront: normFront,
      nationalIdBack: normBack,
      extractedAddress: extractAddressRegionFromBackOcr(backText) || backText.slice(0, 8000),
      isOutsideAddisSheger: !isAddis,
      isFarAddisOutskirts: isFar,
      isStaffRelated: student.isStaffRelated,
      isSpecialNeed: student.isSpecialNeed,
      paymentStatus,
      status,
      chapaTxRef,
      scheduledReleaseAt,
      originVerified,
      originVerificationNote: verificationNote
    };

    let application = await DormApplication.findOne({ student: student._id });
    if (application) {
      Object.assign(application, appPayload);
      await application.save();
    } else {
      application = await DormApplication.create(appPayload);
    }

    // If status became 'Assigned' (for non-Addis free students), save room link
    if (status === 'Assigned') {
      await assignStudentToRoom(application, student);
    }

    if (application.status === 'Assigned' && foundRoom) {
      // For immediate assignment (non-Addis govt student)
      application.assignedRoom = foundRoom._id;
      foundRoom.currentOccupants = (foundRoom.currentOccupants || 0) + 1;
      foundRoom.isFull = foundRoom.currentOccupants >= (foundRoom.capacity || 4);
      if (!foundRoom.assignedStudents) foundRoom.assignedStudents = [];
      foundRoom.assignedStudents.push(student._id);
      await foundRoom.save();
    }

    await application.save();
    await application.populate('student assignedRoom');

    let message = 'Application submitted successfully.';
    if (needsAdminApproval) {
      message = `Your application has been submitted. Since you selected staff-related or special need assistance, please visit your campus administrative office to complete the dorm assignment process. An administrator will review your request and assign you a dorm.`;
    } else if (application.status === 'Waiting') {
      const minuteLabel = cityCategory === 'shager' ? 'Shager' : 'Addis Ababa';
      const waitMinsDisplay = Math.max(0, Math.ceil(waitMs / 60000));
      message = `City of ${minuteLabel} detected. Please wait ${waitMinsDisplay} minute(s) while we verify room availability.`;
    } else if (application.status === 'PaymentPending') {
      message = `Room found (${foundRoom?.building?.name || ''} - ${foundRoom?.roomNumber || ''}) on ${foundCampus || 'assigned'} campus. Please complete your payment to finalize assignment.`;
    } else if (application.status === 'Assigned') {
      message = `Success! Room ${application.assignedRoom?.roomNumber || ''} has been assigned.`;
    }

    const appObj = application.toObject();
    if (application.status === 'Waiting' && application.scheduledReleaseAt) {
      appObj.remainingMs = Math.max(0, new Date(application.scheduledReleaseAt).getTime() - Date.now());
    }

    return res.json({
      success: true,
      message,
      application: appObj,
      chapaPaymentUrl,
      needsAdminApproval,
      deploymentVersion: '2026-05-10-v8-ADMIN-APPROVAL-FIX'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

const getMyApplication = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).populate('user');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    let application = await DormApplication.findOne({ student: student._id }).populate({
      path: 'student',
      populate: { path: 'user' }
    }).populate('assignedRoom');

    if (!application) {
      return res.json({ success: true, application: null, message: 'No application submitted yet' });
    }

    const needsAdminApproval = student.isStaffRelated || student.isSpecialNeed;

    // AUTO-ASSIGN: If waiting period has expired, or if a regular student is stuck in Pending (retry)
    const isWaitingExpired = application.status === 'Waiting' && application.scheduledReleaseAt && Date.now() >= new Date(application.scheduledReleaseAt).getTime();
    const isPendingRetry = application.status === 'Pending' && !needsAdminApproval;

    if (isWaitingExpired || isPendingRetry) {
        if (isWaitingExpired) console.log(`⏰ Wait expired for ${student.user?.name || 'student'} — checking room availability...`);
        if (isPendingRetry) console.log(`🔄 Retrying assignment for Pending student ${student.user?.name || 'student'}...`);
        
        try {
          const { room, isOverflow, campus } = await findRoomForStudent(student, student.isSpecialNeed);
          const isSelfSponsored = isSelfSponsoredStudent(student);

          if (room) {
             if (isSelfSponsored) {
                // MOVE TO PAYMENT PENDING
                application.status = 'PaymentPending';
                application.paymentStatus = 'Pending';
                application.scheduledReleaseAt = null;
                // Initialize Chapa now that we confirmed a room exists
                let chapaPaymentUrl = null;
                try {
                   const paymentInfo = await initializeChapaPayment(student, 3000);
                   application.chapaTxRef = paymentInfo?.tx_ref || null;
                   application.paymentStatus = 'Pending';
                   chapaPaymentUrl = paymentInfo?.checkout_url || null;
                   application.chapaPaymentUrl = chapaPaymentUrl; // Temporary for response
                } catch (pe) {
                   console.error('Chapa init error in polling:', pe.message);
                }
                
                 await Notification.create({
                   user: req.user._id,
                   type: 'DormApplication',
                   title: '🏠 Room Found - Payment Required',
                   message: `A room has been found (${room.building?.name || ''} - ${room.roomNumber}) on ${campus || 'assigned'} campus. Please complete your payment to finalize.`,
                   isSent: true
                 });
             } else {
                // ATTEMPT ASSIGNMENT (for free students)
                const success = await assignStudentToRoom(application, student);
                if (success) {
                   await Notification.create({
                     user: req.user._id,
                     type: 'DormApplication',
                     title: '🎉 Room Assigned!',
                     message: `Verification complete. You have been assigned to ${application.assignedRoom?.roomNumber || 'your room'}.`,
                     isSent: true
                   });
                }
             }
          } else {
            // NO ROOM FOUND
            application.status = 'Pending';
            application.scheduledReleaseAt = null;
            if (isSelfSponsoredStudent(student)) {
              try {
                const paymentInfo = await initializeChapaPayment(student, 3000);
                application.chapaTxRef = paymentInfo?.tx_ref || null;
              } catch (pe) {
                console.error('Chapa init error in queue polling:', pe.message);
              }
            }
            await Notification.create({
               user: req.user._id,
               type: 'DormApplication',
               title: '⏳ No Current Vacancy',
               message: `We verified your location, but no rooms are currently available on your campus. You are now in the queue.`,
               isSent: true
            });
          }
          await application.save();
          // Re-populate after changes
          application = await DormApplication.findOne({ student: student._id }).populate('student assignedRoom');
        } catch (assignErr) {
          console.error(`Auto-assign on poll failed for ${student.fullName}:`, assignErr.message);
      }
    }

    const appObj = application.toObject();
    if (application.status === 'Waiting' && application.scheduledReleaseAt) {
      appObj.remainingMs = Math.max(0, new Date(application.scheduledReleaseAt).getTime() - Date.now());
    }

    return res.json({ 
      success: true, 
      application: appObj, 
      chapaPaymentUrl: application.chapaPaymentUrl || null,
      needsAdminApproval,
      deploymentVersion: '2026-05-09-v7-AUTO-REDIRECT' 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const assignPendingApplications = async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'CampusAdmin') {
      return res.status(403).json({ message: 'Only admins can trigger assignment' });
    }

    const pendingApplications = await DormApplication.find({ status: 'Pending' })
      .populate({
        path: 'student',
        populate: { path: 'user' }
      })
      .sort({ createdAt: 1 });

    if (pendingApplications.length === 0) {
      return res.json({ message: 'No pending applications' });
    }

    const outOfAddisApps = pendingApplications.filter((app) => app.isOutsideAddisSheger);
    if (outOfAddisApps.length === 0) {
      return res.json({ message: 'No out-of-Addis applications yet' });
    }

    const firstOutOfAddisDate = outOfAddisApps[0].createdAt;
    const daysPassed = Math.floor((Date.now() - firstOutOfAddisDate) / (1000 * 60 * 60 * 24));

    if (daysPassed < 7) {
      return res.json({
        message: `Waiting for 7-day priority period. Only ${daysPassed} days passed.`,
        daysPassed,
      });
    }

    let assignedCount = 0;

    for (const app of pendingApplications) {
      if (!app.student) continue;

      const success = await assignStudentToRoom(app, app.student);
      if (success) {
        await app.save();
        assignedCount++;
      }
    }

    return res.json({
      message: `Assignment completed! ${assignedCount} students received dorms.`,
      assignedCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};


const verifyChapaPayment = async (req, res) => {
  try {
    const { tx_ref, status } = req.body || {};

    if (status !== 'success' || !tx_ref) {
      return res.status(200).send('OK');
    }

    const application = await DormApplication.findOne({ chapaTxRef: tx_ref })
      .populate({
        path: 'student',
        populate: { path: 'user' }
      });

    if (!application || application.paymentStatus !== 'Pending') {
      return res.status(200).send('OK');
    }

    const now = new Date();
    application.paymentStatus = 'Paid';
    application.paymentVerifiedAt = now;

    // Logic: If status was PaymentPending, it means they already waited (if Addis) 
    // or skipped wait (if non-Addis) and a room was confirmed available.
    // Now we assign it!
    if (application.status === 'PaymentPending') {
      console.log(`🏠 Assigning room for ${application.student?.fullName || 'student'} after payment...`);
      const success = await assignStudentToRoom(application, application.student);
      if (success) {
        console.log(`✅ Room assigned successfully after payment.`);
      }
    }

    await application.save();

    // Create Notification
    try {
      await Notification.create({
        user: application.student.user,
        type: 'Payment',
        title: '💰 Payment Verified',
        message: `Your payment of 3,000 ETB has been verified. ${application.status === 'Assigned' ? 'Your room has been assigned!' : 'Your application is being finalized.'}`,
        isSent: true
      });
    } catch (notifErr) {
      console.error('Error creating notification:', notifErr.message);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook Error');
  }
};

const resetMyApplication = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const application = await DormApplication.findOne({ student: student._id });
    if (!application) return res.status(404).json({ success: false, message: 'No application found to reset' });

    // If assigned, clean up the room
    if (application.assignedRoom) {
      const room = await Room.findById(application.assignedRoom);
      if (room) {
        room.currentOccupants = Math.max(0, (room.currentOccupants || 0) - 1);
        room.isFull = false;
        if (room.assignedStudents) {
          room.assignedStudents = room.assignedStudents.filter(id => id.toString() !== student._id.toString());
        }
        await room.save();
      }
    }

    await application.deleteOne();
    
    // Clear notifications related to dorm app
    await Notification.deleteMany({ user: req.user._id, type: 'DormApplication' });

    res.json({ success: true, message: 'Application and room assignment reset successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Reset failed: ' + err.message });
  }
};

const getDormApplicationConfig = async (req, res) => {
  try {
    let config = await DormApplicationConfig.findOne({ key: 'global' });
    if (!config) {
      config = await DormApplicationConfig.create({ key: 'global', isOpen: false });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  submitApplication,
  verifyChapaPayment,
  getMyApplication,
  assignPendingApplications,
  assignStudentToRoom,
  findRoomForStudent,
  getOcrScheduler,
  resetMyApplication,
  getDormApplicationConfig
};
