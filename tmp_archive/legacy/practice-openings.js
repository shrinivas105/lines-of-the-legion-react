const PracticeOpenings = [];

const PracticeOpeningsManager = {
  storageKey: 'practiceOpeningsUserLines',
  deletedBaseRowsKey: 'practiceOpeningsDeletedBaseRows',
  csvFileName: 'practice-openings.csv',
  baseRows: [],
  userRows: [],
  deletedBaseIndexes: [],
  isLoaded: false,
  loadPromise: null,

  init() {
    if (this.loadPromise) return this.loadPromise;
    return this.loadPromise = this.load();
  },

  async load() {
    const csvText = await this.loadCsvFile();
    this.baseRows = csvText ? this.parseCsv(csvText).map((row, index) => ({ ...row, source: 'base', originalIndex: index })) : [];
    this.userRows = this.loadUserRows().map((row, index) => ({ ...row, source: 'user', originalIndex: index }));
    this.deletedBaseIndexes = this.loadDeletedBaseIndexes();
    this.refreshPracticeOpenings();
    this.isLoaded = true;
    if (window.app && window.app.mode === 'practice') {
      window.app.render();
    }
    return PracticeOpenings;
  },

  async loadCsvFile() {
    try {
      const response = await fetch(this.csvFileName, { cache: 'reload' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      console.warn('Practice openings CSV could not be loaded:', error);
      return '';
    }
  },

  loadUserRows() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveUserRows() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.userRows));
    } catch {}
  },

  loadDeletedBaseIndexes() {
    try {
      const raw = localStorage.getItem(this.deletedBaseRowsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveDeletedBaseIndexes() {
    try {
      localStorage.setItem(this.deletedBaseRowsKey, JSON.stringify(this.deletedBaseIndexes));
    } catch {}
  },

  refreshPracticeOpenings() {
    PracticeOpenings.length = 0;
    this.baseRows.forEach(row => {
      if (!this.deletedBaseIndexes.includes(row.originalIndex)) {
        PracticeOpenings.push(row);
      }
    });
    this.userRows.forEach(row => PracticeOpenings.push(row));
  },

  formatName(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word ? word[0].toUpperCase() + word.slice(1) : '')
      .join(' ');
  },

  addLine({ name, fen, orientation }) {
    const row = {
      name: this.formatName(name),
      fen: String(fen || '').trim(),
      orientation: String(orientation || '').trim().toLowerCase() === 'black' ? 'black' : 'white',
      source: 'user',
      originalIndex: this.userRows.length,
    };
    if (!row.name || !row.fen) {
      alert('Name, FEN, and orientation are required.');
      return;
    }
    this.userRows.push(row);
    this.saveUserRows();
    this.refreshPracticeOpenings();
    if (window.app) window.app.render();
    this.downloadCsvFile(`practice-openings-${new Date().toISOString().slice(0, 10)}.csv`);
    this.toggleAddModal(false);
  },

  normalizeRow(row) {
    const name = this.formatName(row.name);
    const fen = String(row.fen || '').trim();
    let orientation = String(row.orientation || '').trim().toLowerCase();
    if (!name || !fen) return null;
    if (orientation !== 'black') orientation = 'white';
    return { name, fen, orientation };
  },

  parseCsv(text) {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter(line => line.trim().length > 0);
    if (!lines.length) return [];
    const header = this.parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const values = this.parseCsvLine(line);
      const row = {};
      header.forEach((key, index) => { row[key] = values[index] ?? ''; });
      return this.normalizeRow(row);
    }).filter(Boolean);
  },

  parseCsvLine(line) {
    const values = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (insideQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            insideQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  },

  stringifyCsv(rows) {
    const header = ['name', 'fen', 'orientation'];
    const escape = value => `"${String(value || '').replace(/"/g, '""')}"`;
    const lines = rows.map(row => header.map(key => escape(row[key] ?? '')).join(','));
    return [header.join(','), ...lines].join('\n');
  },

  downloadCsvFile(filename = 'practice-openings.csv') {
    const csv = this.stringifyCsv(PracticeOpenings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  openUploadDialog() {
    document.getElementById('practiceOpeningsUploadInput')?.click();
  },

  handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    this.handleUploadFile(file);
  },

  async handleUploadFile(file) {
    try {
      const text = await file.text();
      const rows = this.parseCsv(text).map((row, index) => ({
        ...row,
        source: 'user',
        originalIndex: index,
      }));
      if (!rows.length) {
        alert('No valid practice lines found. Each row needs name, fen, and orientation.');
        return;
      }
      this.userRows = rows;
      this.saveUserRows();
      this.refreshPracticeOpenings();
      if (window.app) window.app.render();
      alert(`Loaded ${rows.length} practice line${rows.length !== 1 ? 's' : ''} from ${file.name}`);
    } catch (error) {
      console.error(error);
      alert('Unable to load the CSV file. Please upload a valid practice openings CSV.');
    }
  },

  toggleAddModal(show) {
    const modal = document.getElementById('practiceAddModal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';
    if (show) {
      const nameField = document.getElementById('practiceAddName');
      if (nameField) nameField.focus();
    }
  },

  handleAddSave() {
    const name = document.getElementById('practiceAddName')?.value || '';
    const fen = document.getElementById('practiceAddFen')?.value || '';
    const orientation = document.querySelector('input[name="practiceAddOrientation"]:checked')?.value || 'white';
    this.addLine({ name, fen, orientation });
  },

  removeLine(source, index) {
    if (source === 'base') {
      if (typeof index !== 'number' || index < 0 || index >= this.baseRows.length) return;
      if (!this.deletedBaseIndexes.includes(index)) {
        this.deletedBaseIndexes.push(index);
        this.saveDeletedBaseIndexes();
        this.refreshPracticeOpenings();
        if (window.app) window.app.render();
      }
      return;
    }

    if (source === 'user') {
      if (typeof index !== 'number' || index < 0 || index >= this.userRows.length) return;
      this.userRows.splice(index, 1);
      this.saveUserRows();
      this.refreshPracticeOpenings();
      if (window.app) window.app.render();
    }
  },

  bindPracticePicker() {
    const uploadInput = document.getElementById('practiceOpeningsUploadInput');
    if (uploadInput) uploadInput.onchange = (event) => this.handleFileChange(event);
    const addBtn = document.getElementById('practiceAddBtn');
    if (addBtn) addBtn.onclick = () => this.toggleAddModal(true);
    const uploadBtn = document.getElementById('practiceUploadBtn');
    if (uploadBtn) uploadBtn.onclick = () => this.openUploadDialog();
    const downloadBtn = document.getElementById('practiceDownloadBtn');
    if (downloadBtn) downloadBtn.onclick = () => this.downloadCsvFile();
    const saveBtn = document.getElementById('practiceAddSaveBtn');
    if (saveBtn) saveBtn.onclick = () => this.handleAddSave();
    const cancelBtn = document.getElementById('practiceAddCancelBtn');
    if (cancelBtn) cancelBtn.onclick = () => this.toggleAddModal(false);
  },
};

PracticeOpeningsManager.init();
