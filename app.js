(function() {
    const STORAGE_KEYS = {
        roster: 'spt_roster_v1',
        attendance: 'spt_attendance_by_date_v1',
    };

    function getTodayKey() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function loadRoster() {
        const raw = localStorage.getItem(STORAGE_KEYS.roster);
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
    }

    function saveRoster(roster) {
        localStorage.setItem(STORAGE_KEYS.roster, JSON.stringify(roster));
    }

    function ensureSampleRoster() {
        const existing = loadRoster();
        if (existing && existing.length) return existing;
        const sample = [
            { id: crypto.randomUUID(), name: 'Alex Johnson', grade: '10A' },
            { id: crypto.randomUUID(), name: 'Briana Lee', grade: '10A' },
            { id: crypto.randomUUID(), name: 'Carlos Ruiz', grade: '10B' },
            { id: crypto.randomUUID(), name: 'Dana Kim', grade: '10B' },
            { id: crypto.randomUUID(), name: 'Evan Patel', grade: '11A' },
            { id: crypto.randomUUID(), name: 'Fatima Noor', grade: '11A' },
            { id: crypto.randomUUID(), name: 'George Smith', grade: '11B' },
            { id: crypto.randomUUID(), name: 'Hannah Brown', grade: '12A' },
        ];
        saveRoster(sample);
        return sample;
    }

    function loadAttendanceByDate() {
        const raw = localStorage.getItem(STORAGE_KEYS.attendance);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }

    function saveAttendanceByDate(map) {
        localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(map));
    }

    function getTodayAttendance() {
        const map = loadAttendanceByDate();
        const key = getTodayKey();
        return map[key] || {};
    }

    function setTodayAttendance(todayAttendance) {
        const map = loadAttendanceByDate();
        const key = getTodayKey();
        map[key] = todayAttendance;
        saveAttendanceByDate(map);
    }

    function upsertTodayAttendance(studentId, updates) {
        const today = getTodayAttendance();
        const current = today[studentId] || { present: false, inClass: false, lastSeenAt: null };
        const merged = { ...current, ...updates };
        today[studentId] = merged;
        setTodayAttendance(today);
        return merged;
    }

    function renderStatus(message) {
        const el = document.getElementById('status');
        if (!el) return;
        el.textContent = message;
        if (!message) return;
        window.clearTimeout(renderStatus._t);
        renderStatus._t = window.setTimeout(() => { el.textContent = ''; }, 2500);
    }

    function createStudentCard(student, options) {
        const { context, attendance } = options;
        const card = document.createElement('div');
        card.className = 'card';

        const header = document.createElement('div');
        header.className = 'card-header';

        const left = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = student.name;
        const grade = document.createElement('div');
        grade.className = 'grade';
        grade.textContent = student.grade;
        left.appendChild(name);
        left.appendChild(grade);

        const right = document.createElement('div');
        const pill = document.createElement('span');
        pill.className = 'pill';
        right.appendChild(pill);

        header.appendChild(left);
        header.appendChild(right);
        card.appendChild(header);

        const row = document.createElement('div');
        row.className = 'row';

        const presentLabel = document.createElement('label');
        const presentCheckbox = document.createElement('input');
        presentCheckbox.type = 'checkbox';
        presentCheckbox.checked = !!attendance.present;
        presentLabel.appendChild(presentCheckbox);
        presentLabel.appendChild(document.createTextNode(' Present today'));

        const inClassLabel = document.createElement('label');
        const inClassCheckbox = document.createElement('input');
        inClassCheckbox.type = 'checkbox';
        inClassCheckbox.checked = !!attendance.inClass;
        inClassLabel.appendChild(inClassCheckbox);
        inClassLabel.appendChild(document.createTextNode(' In class now'));

        const lastSeen = document.createElement('div');
        lastSeen.className = 'grade';
        lastSeen.textContent = attendance.lastSeenAt ? `Last seen: ${new Date(attendance.lastSeenAt).toLocaleTimeString()}` : '';

        const delBtn = document.createElement('button');
        delBtn.textContent = 'Remove';
        delBtn.className = 'danger';

        function updatePill() {
            pill.className = 'pill';
            if (context === 'morning') {
                if (presentCheckbox.checked) { pill.classList.add('present'); pill.textContent = 'Present'; }
                else { pill.classList.add('absent'); pill.textContent = 'Absent'; }
            } else if (context === 'between') {
                if (inClassCheckbox.checked) { pill.classList.add('present'); pill.textContent = 'In class'; }
                else { pill.classList.add('missing'); pill.textContent = 'Missing'; }
            } else {
                pill.textContent = '';
            }
        }
        updatePill();

        if (context === 'morning') {
            row.appendChild(presentLabel);
            row.appendChild(lastSeen);
        } else if (context === 'between') {
            row.appendChild(inClassLabel);
            row.appendChild(lastSeen);
        } else if (context === 'roster') {
            const spacer = document.createElement('div');
            spacer.className = 'spacer';
            row.appendChild(spacer);
            row.appendChild(delBtn);
        }

        card.appendChild(row);

        presentCheckbox.addEventListener('change', () => {
            upsertTodayAttendance(student.id, { present: presentCheckbox.checked });
            updatePill();
            // Re-render to apply sorting immediately
            renderMorning();
            renderBetween();
        });

        inClassCheckbox.addEventListener('change', () => {
            const updated = upsertTodayAttendance(student.id, {
                inClass: inClassCheckbox.checked,
                lastSeenAt: inClassCheckbox.checked ? new Date().toISOString() : attendance.lastSeenAt,
            });
            lastSeen.textContent = updated.lastSeenAt ? `Last seen: ${new Date(updated.lastSeenAt).toLocaleTimeString()}` : '';
            updatePill();
            // Re-render to apply sorting immediately (Between Classes view)
            renderBetween();
        });

        delBtn.addEventListener('click', () => {
            if (!confirm(`Remove ${student.name} from roster?`)) return;
            const roster = loadRoster().filter(s => s.id !== student.id);
            saveRoster(roster);
            renderRoster();
            renderMorning();
            renderBetween();
            renderStatus('Removed from roster');
        });

        return card;
    }

    function filterBySearch(list, query, fields) {
        const q = query.trim().toLowerCase();
        if (!q) return list;
        return list.filter(item => fields.some(f => String(item[f] || '').toLowerCase().includes(q)));
    }

    function renderMorning() {
        const container = document.getElementById('morning-list');
        const search = document.getElementById('search-morning').value;
        const roster = filterBySearch(loadRoster(), search, ['name', 'grade']);
        const today = getTodayAttendance();
        // Sort so absent (present === false) come first
        roster.sort((a, b) => Number(!!(today[a.id]?.present)) - Number(!!(today[b.id]?.present)) || a.name.localeCompare(b.name));
        container.innerHTML = '';
        roster.forEach(student => {
            const att = today[student.id] || { present: false, inClass: false, lastSeenAt: null };
            const card = createStudentCard(student, { context: 'morning', attendance: att });
            container.appendChild(card);
        });
    }

    function renderBetween() {
        const container = document.getElementById('between-list');
        const search = document.getElementById('search-between').value;
        const showMissingOnly = document.getElementById('show-missing-only').checked;
        const roster = filterBySearch(loadRoster(), search, ['name', 'grade']);
        const today = getTodayAttendance();
        container.innerHTML = '';
        roster
            .filter(s => (today[s.id]?.present) === true)
            .filter(s => showMissingOnly ? (today[s.id]?.inClass) !== true : true)
            // Sort so missing (inClass === false) come first
            .sort((a, b) => Number(!!(today[a.id]?.inClass)) - Number(!!(today[b.id]?.inClass)) || a.name.localeCompare(b.name))
            .forEach(student => {
                const att = today[student.id] || { present: false, inClass: false, lastSeenAt: null };
                const card = createStudentCard(student, { context: 'between', attendance: att });
                container.appendChild(card);
            });
    }

    function renderRoster() {
        const container = document.getElementById('roster-list');
        const search = document.getElementById('search-roster').value;
        const roster = filterBySearch(loadRoster(), search, ['name', 'grade']);
        container.innerHTML = '';
        roster.forEach(student => {
            const card = createStudentCard(student, { context: 'roster', attendance: {} });
            container.appendChild(card);
        });
    }

    function bindMorningToolbar() {
        document.getElementById('mark-all-present').addEventListener('click', () => {
            const roster = loadRoster();
            const today = getTodayAttendance();
            roster.forEach(s => { today[s.id] = { ...(today[s.id] || {}), present: true, inClass: false } });
            setTodayAttendance(today);
            renderMorning();
            renderBetween();
            renderStatus('All marked present');
        });
        document.getElementById('mark-all-absent').addEventListener('click', () => {
            const roster = loadRoster();
            const today = getTodayAttendance();
            roster.forEach(s => { today[s.id] = { ...(today[s.id] || {}), present: false, inClass: false } });
            setTodayAttendance(today);
            renderMorning();
            renderBetween();
            renderStatus('All marked absent');
        });
        document.getElementById('save-morning').addEventListener('click', () => {
            renderStatus('Morning attendance saved');
        });
        document.getElementById('search-morning').addEventListener('input', renderMorning);
    }

    function bindBetweenToolbar() {
        document.getElementById('mark-all-inclass').addEventListener('click', () => {
            const today = getTodayAttendance();
            const nowIso = new Date().toISOString();
            Object.keys(today).forEach(id => {
                if (today[id].present) {
                    today[id].inClass = true;
                    today[id].lastSeenAt = nowIso;
                }
            });
            setTodayAttendance(today);
            renderBetween();
            renderStatus('All present students marked in class');
        });
        document.getElementById('clear-all-inclass').addEventListener('click', () => {
            const today = getTodayAttendance();
            Object.keys(today).forEach(id => { if (today[id].present) { today[id].inClass = false; } });
            setTodayAttendance(today);
            renderBetween();
            renderStatus('Cleared in-class flags');
        });
        document.getElementById('show-missing-only').addEventListener('change', renderBetween);
        document.getElementById('search-between').addEventListener('input', renderBetween);
        document.getElementById('export-missing').addEventListener('click', () => {
            const roster = loadRoster();
            const today = getTodayAttendance();
            const missing = roster.filter(s => today[s.id]?.present && !today[s.id]?.inClass);
            const lines = ['Name,Grade', ...missing.map(s => `${escapeCsv(s.name)},${escapeCsv(s.grade)}`)];
            const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `missing-${getTodayKey()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            renderStatus('Exported missing list');
        });
    }

    function bindRosterToolbar() {
        document.getElementById('add-student-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('new-student-name').value.trim();
            const grade = document.getElementById('new-student-grade').value.trim();
            if (!name || !grade) return;
            const roster = loadRoster();
            roster.push({ id: crypto.randomUUID(), name, grade });
            saveRoster(roster);
            (document.getElementById('add-student-form')).reset();
            renderRoster();
            renderMorning();
            renderStatus('Student added');
        });

        document.getElementById('export-csv').addEventListener('click', () => {
            const roster = loadRoster();
            const lines = ['Name,Grade', ...roster.map(s => `${escapeCsv(s.name)},${escapeCsv(s.grade)}`)];
            const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'roster.csv';
            a.click();
            URL.revokeObjectURL(url);
            renderStatus('Exported roster');
        });

        document.getElementById('import-csv').addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            const parsed = parseCsv(text);
            const header = parsed[0]?.map(h => h.trim().toLowerCase()) || [];
            const nameIdx = header.findIndex(h => ['name', 'student', 'student name'].includes(h));
            const gradeIdx = header.findIndex(h => ['grade', 'class', 'room'].includes(h));
            if (nameIdx === -1) {
                alert('CSV must include a Name column.');
                return;
            }
            const roster = [];
            for (let i = 1; i < parsed.length; i++) {
                const row = parsed[i];
                if (!row || !row.length) continue;
                const name = (row[nameIdx] || '').trim();
                const grade = gradeIdx !== -1 ? (row[gradeIdx] || '').trim() : '';
                if (!name) continue;
                roster.push({ id: crypto.randomUUID(), name, grade });
            }
            if (!roster.length) {
                alert('No students found in CSV.');
                return;
            }
            saveRoster(roster);
            renderRoster();
            renderMorning();
            renderBetween();
            renderStatus('Imported roster from CSV');
            e.target.value = '';
        });

        document.getElementById('reset-sample').addEventListener('click', () => {
            const roster = ensureSampleRoster();
            saveRoster(roster);
            renderRoster();
            renderMorning();
            renderBetween();
            renderStatus('Sample roster loaded');
        });

        document.getElementById('search-roster').addEventListener('input', renderRoster);
    }

    function escapeCsv(value) {
        const needsQuotes = /[",\n]/.test(value);
        const safe = value.replaceAll('"', '""');
        return needsQuotes ? `"${safe}"` : safe;
    }

    function parseCsv(text) {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const rows = [];
        let i = 0;
        while (i < lines.length) {
            let line = lines[i];
            let row = [];
            let cur = '';
            let inQuotes = false;
            for (let j = 0; j <= line.length; j++) {
                const ch = line[j];
                if (inQuotes) {
                    if (ch === '"') {
                        if (line[j + 1] === '"') { cur += '"'; j++; }
                        else { inQuotes = false; }
                    } else if (ch === undefined) {
                        // Continue multi-line quoted value
                        i++;
                        if (i < lines.length) { line = line + '\n' + lines[i]; j--; }
                    } else { cur += ch; }
                } else {
                    if (ch === '"') { inQuotes = true; }
                    else if (ch === ',' || ch === undefined) { row.push(cur); cur = ''; }
                    else { cur += ch; }
                }
            }
            rows.push(row);
            i++;
        }
        return rows.filter(r => r.length && r.some(c => (c || '').trim().length));
    }

    function bindGlobal() {
        // When switching tabs, re-render current view
        document.querySelector('[data-tab="morning"]').addEventListener('click', renderMorning);
        document.querySelector('[data-tab="between"]').addEventListener('click', renderBetween);
        document.querySelector('[data-tab="roster"]').addEventListener('click', renderRoster);
    }

    function init() {
        ensureSampleRoster();
        bindGlobal();
        bindMorningToolbar();
        bindBetweenToolbar();
        bindRosterToolbar();
        renderRoster();
        renderMorning();
        renderBetween();
    }

    document.addEventListener('DOMContentLoaded', init);
})();



