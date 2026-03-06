#!/usr/bin/env node
/**
 * Kormányablak Slot Checker — CDP mode
 *
 * Connects to a Chromium-based browser running with --remote-debugging-port=9222
 * and uses the already-authenticated session to check available appointment slots.
 *
 * Usage:
 *   node check_slots.js [--county budapest|pest] [--weeks 3] [--port 9222]
 */

const WebSocket = require('ws');
const http = require('http');

const args = process.argv.slice(2);
const county = args.includes('--county') ? args[args.indexOf('--county') + 1] : 'budapest';
const weeksAhead = args.includes('--weeks') ? parseInt(args[args.indexOf('--weeks') + 1]) : 6;
const debugPort = args.includes('--port') ? args[args.indexOf('--port') + 1] : 9222;

// Appointment type — change this to your case ID
const CASE_ID = process.env.CASE_ID || 'OKMIR00107';

// Generate week start dates (Mondays)
function getWeeks(count) {
  const weeks = [];
  const today = new Date();
  // Find next Monday
  const day = today.getDay();
  const daysToMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToMonday);
  for (let i = 0; i < count; i++) {
    const d = new Date(nextMonday);
    d.setDate(nextMonday.getDate() + i * 7);
    weeks.push(d.toISOString().split('T')[0]);
  }
  return weeks;
}

// Budapest office IDs
const BUDAPEST_OFFICES = [
  { id: '61',  label: '1013 Budapest, Attila út 12.' },
  { id: '62',  label: '1024 Budapest, Margit körút 47-49.' },
  { id: '280', label: '1029 Budapest, Bátori László u. 2.' },
  { id: '63',  label: '1033 Budapest, Harrer Pál utca 9-11.' },
  { id: '64',  label: '1042 Budapest, István út 15.' },
  { id: '65',  label: '1051 Budapest, Erzsébet tér 3.' },
  { id: '66',  label: '1062 Budapest, Andrássy út 55.' },
  { id: '286', label: '1062 Budapest, Teréz körút 55. (Nyugati)' },
  { id: '68',  label: '1073 Budapest, Erzsébet körút 6.' },
  { id: '69',  label: '1082 Budapest, Baross utca 59.' },
  { id: '70',  label: '1087 Budapest, Kerepesi út 2-6. (Keleti)' },
  { id: '72',  label: '1092 Budapest, Bakáts tér 14.' },
  { id: '73',  label: '1102 Budapest, Havas Ignác utca 1-3.' },
  { id: '75',  label: '1113 Budapest, Bocskai út 39-41.' },
  { id: '78',  label: '1126 Budapest, Kiss János altábornagy u. 31-33/A' },
  { id: '347', label: '1133 Budapest, Visegrádi u. 110. (Központi)' },
  { id: '80',  label: '1139 Budapest, Teve utca 1/A-C' },
  { id: '81',  label: '1145 Budapest, Pétervárad utca 17.' },
  { id: '83',  label: '1153 Budapest, Bácska utca 14.' },
  { id: '84',  label: '1165 Budapest, Baross Gábor utca 28-30.' },
  { id: '85',  label: '1173 Budapest, Pesti út 163.' },
  { id: '86',  label: '1181 Budapest, Üllői út 445.' },
  { id: '87',  label: '1195 Budapest, Városház tér 18-20.' },
  { id: '89',  label: '1201 Budapest, Vörösmarty utca 3.' },
  { id: '90',  label: '1211 Budapest, Szent Imre tér 11.' },
  { id: '91',  label: '1221 Budapest, Kossuth Lajos utca 25-29.' },
  { id: '93',  label: '1238 Budapest, Grassalkovich út 158.' },
];

// Pest Vármegye office IDs
const PEST_OFFICES = [
  { id: '107', label: '2457 Adony, Rákóczi utca 21.' },
  { id: '108', label: '2060 Bicske, Szent István út 7-11.' },
  { id: '109', label: '2400 Dunaújváros, Október 23. tér 1.' },
  { id: '307', label: '2451 Ercsi, Fő utca 27.' },
  { id: '111', label: '2483 Gárdony, Szabadság út 20-22.' },
  { id: '112', label: '2462 Martonvásár, Budai út 1.' },
  { id: '170', label: '2510 Dorog, Hantken Miksa utca 8.' },
  { id: '171', label: '2500 Esztergom, Bottyán János utca 3.' },
  { id: '308', label: '2536 Nyergesújfalu, Kossuth Lajos utca 104-106.' },
  { id: '178', label: '2660 Balassagyarmat, Rákóczi fejedelem út 12.' },
  { id: '181', label: '2651 Rétság, Rákóczi út 20-21.' },
  { id: '316', label: '2740 Abony, Kossuth Lajos tér 1.' },
  { id: '184', label: '2170 Aszód, Szabadság tér 9.' },
  { id: '185', label: '2092 Budakeszi, Dózsa György tér 25.' },
  { id: '186', label: '2040 Budaörs, Szabadság út 134.' },
  { id: '191', label: '2700 Cegléd, Kossuth tér 1.' },
  { id: '187', label: '2700 Cegléd, Kölcsey tér 3.' },
  { id: '188', label: '2371 Dabas, Szent János út 112.' },
  { id: '306', label: '2049 Diósd, Szent István tér 1.' },
  { id: '355', label: '2330 Dunaharaszti, Báthory utca 1.' },
  { id: '322', label: '2120 Dunakeszi, Verseny utca 1.' },
  { id: '190', label: '2030 Érd, Budai út 8.' },
  { id: '321', label: '2030 Érd, Diósdi út 4.' },
  { id: '192', label: '2100 Gödöllő, Kotlán Sándor utca 1-3.' },
  { id: '193', label: '2360 Gyál, Somogyi Béla utca 2.' },
  { id: '317', label: '2230 Gyömrő, Fő tér 1/A' },
  { id: '194', label: '2200 Monor, Kossuth Lajos utca 78-80.' },
  { id: '195', label: '2760 Nagykáta, Dózsa György út 3.' },
  { id: '196', label: '2750 Nagykőrös, Szabadság tér 4.' },
  { id: '311', label: '2364 Ócsa, Bajcsy-Zsilinszky utca 26.' },
  { id: '314', label: '2119 Pécel, Kossuth tér 1.' },
  { id: '197', label: '2085 Pilisvörösvár, Fő utca 66.' },
  { id: '198', label: '2300 Ráckeve, Szent István tér 4.' },
  { id: '199', label: '2440 Százhalombatta, Szent István tér 5.' },
  { id: '200', label: '2000 Szentendre, Dózsa György út 8.' },
  { id: '201', label: '2310 Szigetszentmiklós, Apor Vilmos utca 1.' },
  { id: '202', label: '2628 Szob, Szent Imre utca 12.' },
  { id: '203', label: '2022 Tahitótfalu, Szabadság tér 3.' },
  { id: '348', label: '2316 Tököl, Fő utca 119.' },
  { id: '310', label: '2045 Törökbálint, Munkácsy Mihály utca 79.' },
  { id: '366', label: '2194 Tura, Puskin tér 26.' },
  { id: '315', label: '2600 Vác, Dr. Csányi László krt. 45.' },
  { id: '205', label: '2600 Vác, Széchenyi utca 42.' },
  { id: '206', label: '2220 Vecsés, Fő út 246-248.' },
  { id: '312', label: '2112 Veresegyház, Fő út 45-47.' },
];

function getPageId() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${debugPort}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const tabs = JSON.parse(data);
        const tab = tabs.find(t => t.type === 'page' && t.url.includes('idopontfoglalo.kh.gov.hu'));
        if (!tab) reject(new Error('No idopontfoglalo tab found. Make sure the booking site is open in your browser.'));
        else resolve(tab.id);
      });
    }).on('error', () => reject(new Error(`Cannot connect to browser debug port ${debugPort}. Make sure Opera/Chrome is running with --remote-debugging-port=${debugPort}`)));
  });
}

async function checkOffices(pageId, offices, weeks) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${debugPort}/devtools/page/${pageId}`);
    const officeListJson = JSON.stringify(offices);
    const weeksJson = JSON.stringify(weeks);
    const expr = `
      (async function() {
        var offices = ${officeListJson};
        var weeks = ${weeksJson};
        var caseId = '${CASE_ID}';
        var results = [];
        var parser = new DOMParser();

        for (var i = 0; i < offices.length; i++) {
          var office = offices[i];
          await fetch('/ugyek-' + caseId + '/kormanyablak-valasztas', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: 'form%5BgovernmentWindow%5D=' + office.id,
            redirect: 'follow'
          });

          var firstAvailable = null;
          for (var w = 0; w < weeks.length; w++) {
            var resp = await fetch('/ugyek-' + caseId + '/kormanyablak-' + office.id + '/idopont-valasztas/' + weeks[w]);
            var text = await resp.text();
            var doc = parser.parseFromString(text, 'text/html');
            var tds = Array.from(doc.querySelectorAll('table td')).filter(function(td) { return td.querySelector('a'); });
            var links = tds.map(function(td) {
              var href = td.querySelector('a').href;
              var parts = href.split('/idopont/');
              return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
            }).filter(Boolean);

            if (links.length > 0) {
              firstAvailable = {week: weeks[w], count: links.length, slots: links.slice(0, 5)};
              break;
            }
            await new Promise(function(r) { setTimeout(r, 150); });
          }

          results.push({id: office.id, label: office.label, firstAvailable: firstAvailable});
          await new Promise(function(r) { setTimeout(r, 150); });
        }
        return results;
      })()
    `;

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { awaitPromise: true, timeout: 600000, expression: expr, returnByValue: true } }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.id === 1) {
        const results = msg.result && msg.result.result && msg.result.result.value || [];
        ws.close();
        resolve(results);
      }
    });
  });
}

function printResults(results) {
  const withSlots = results.filter(r => r.firstAvailable);
  const noSlots = results.filter(r => !r.firstAvailable);

  withSlots.sort((a, b) => a.firstAvailable.week.localeCompare(b.firstAvailable.week));

  if (withSlots.length === 0) {
    console.log('No available slots found in the checked period.');
  } else {
    console.log('OFFICES WITH AVAILABLE SLOTS:\n');
    withSlots.forEach(r => {
      console.log(`  ${r.label}`);
      console.log(`    First available: ${r.firstAvailable.week} (${r.firstAvailable.count} slots)`);
      r.firstAvailable.slots.forEach(s => console.log(`    - ${s}`));
      console.log('');
    });
  }

  if (noSlots.length > 0) {
    console.log(`FULLY BOOKED (checked ${weeksAhead} weeks): ${noSlots.length} offices`);
    noSlots.forEach(r => console.log(`  - ${r.label}`));
  }
}

async function main() {
  console.log(`Connecting to browser on port ${debugPort}...`);
  const pageId = await getPageId();
  console.log(`Found booking tab. Checking ${county === 'pest' ? 'Pest Vármegye' : 'Budapest'} offices for the next ${weeksAhead} weeks...\n`);

  const offices = county === 'pest' ? PEST_OFFICES : BUDAPEST_OFFICES;
  const weeks = getWeeks(weeksAhead);

  console.log(`Checking weeks: ${weeks.join(', ')}\n`);

  const results = await checkOffices(pageId, offices, weeks);
  printResults(results);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
