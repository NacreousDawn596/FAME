/**
 * Managers for School App API
 * NOTE: patched from ESM to CommonJS to match the rest of the vendored library.
 */
const { GradesManager } = require('./grades_manager.js');
const { AttendanceManager } = require('./attendance_manager.js');
const { ProfileManager } = require('./profile_manager.js');
const { CourseManager } = require('./course_manager.js');

module.exports = { GradesManager, AttendanceManager, ProfileManager, CourseManager };
