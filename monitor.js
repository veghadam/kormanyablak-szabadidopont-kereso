#!/usr/bin/env node
/**
 * Kormányablak Slot Monitor
 *
 * Runs check_slots.js on a schedule and sends a desktop notification
 * (macOS) or prints to console when new slots appear.
 *
 * Usage:
 *   node monitor.js [--county budapest|pest] [--interval 5] [--port 9222]
 *
 * Options:
 *   --county    budapest or pest (default: budapest)
 *   --interval  check interval in minutes (default: 5)
 *   --port      browser debug port (default: 9222)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const county = args.includes('--county') ? args[args.indexOf('--county') + 1] : 'budapest';
const intervalMin = args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) : 5;
const port = args.includes('--port') ? args[args.indexOf('--port') + 1] : 9222;

const checkScript = path.join(__dirname, 'check_slots.js');

let lastResults = {};

function notify(title, message) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execSync(`osascript -e 'display notification "${message}" with title "${title}"'`);
    } else if (platform === 'linux') {
      execSync(`notify-send "${title}" "${message}"`);
    }
  } catch (e) {
    // Notification failed, just log
  }
  console.log(`\n🔔 ${title}: ${message}`);
}

function runCheck() {
  console.log(`[${new Date().toISOString()}] Running check...`);

  const proc = spawn('node', [checkScript, '--county', county, '--port', port], { encoding: 'utf8' });
  let output = '';

  proc.stdout.on('data', d => output += d);
  proc.stderr.on('data', d => process.stderr.write(d));

  proc.on('close', () => {
    const lines = output.split('\n');
    const officeLines = lines.filter(l => l.trim().match(/^\d{4}/));

    officeLines.forEach(line => {
      const office = line.trim();
      if (!lastResults[office]) {
        lastResults[office] = true;
        notify('Szabad időpont!', office);
      }
    });

    // Reset offices that disappeared (got booked)
    Object.keys(lastResults).forEach(k => {
      if (!officeLines.some(l => l.trim() === k)) {
        delete lastResults[k];
      }
    });

    console.log(output);
    console.log(`Next check in ${intervalMin} minute(s)...\n`);
  });
}

console.log(`Monitoring ${county === 'pest' ? 'Pest Vármegye' : 'Budapest'} offices every ${intervalMin} min`);
console.log('Press Ctrl+C to stop\n');

runCheck();
setInterval(runCheck, intervalMin * 60 * 1000);
