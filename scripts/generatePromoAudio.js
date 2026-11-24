const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

function getDuration(filePath) {
  try {
    execSync(`"${ffmpeg}" -i "${filePath}"`, { stdio: 'pipe' });
  } catch (e) {
    const output = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
    const m = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (m) {
      return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3]);
    }
  }
  return 0;
}

const outDir = path.join(__dirname, '../temp_promo');
const studentPath = path.join(outDir, 'student.mp3');
const tutorPath = path.join(outDir, 'tutor.mp3');
const fullAudioPath = path.join(outDir, 'full_audio.mp3');

const sDur = getDuration(studentPath);
const tDur = getDuration(tutorPath);
const fDur = getDuration(fullAudioPath);

console.log('TIMINGS:');
console.log('Student audio duration:', sDur, 's');
console.log('Tutor audio duration:', tDur, 's');
console.log('Full combined audio duration:', fDur, 's');

const metadata = {
  studentDuration: sDur,
  silenceDuration: 0.5,
  tutorStartTime: sDur + 0.5,
  tutorDuration: tDur,
  totalDuration: fDur
};

fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(metadata, null, 2));
console.log('Saved meta.json successfully');
