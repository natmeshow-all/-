const locations = [
  "AS/RS",
  "Bottom",
  "Cross Roller",
  "FZ",
  "FZ จุดตีผสม",
  "Make Up RTE",
  "Make up RTE",
  "MakeUp RTE",
  "Never Plus",
  "Packing FZ",
  "Packing FZ ",
  "Packing FZ Pie Line",
  "Packing RTE",
  "Packing RTE ",
  "Satellite",
  "Top",
  "จุดตีผสม ใต้ตึก",
  "จุดต่อโดว์",
  "ชุดฟีดเนย"
];

const normalizedMap = new Map();
locations.forEach(loc => {
    const trimmed = loc.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    
    // Key for deduplication: lowercase, no spaces
    const key = trimmed.toLowerCase().replace(/\s+/g, '');
    
    if (!normalizedMap.has(key)) {
        normalizedMap.set(key, trimmed);
    } else {
        const current = normalizedMap.get(key);
        // Prefer the one with spaces if the key stripped spaces
        const currentSpaces = (current.match(/\s/g) || []).length;
        const newSpaces = (trimmed.match(/\s/g) || []).length;
        
        // Prefer more capital letters if spaces are equal
        const currentCaps = (current.match(/[A-Z]/g) || []).length;
        const newCaps = (trimmed.match(/[A-Z]/g) || []).length;
        
        if (newSpaces > currentSpaces) {
            normalizedMap.set(key, trimmed);
        } else if (newSpaces === currentSpaces && newCaps > currentCaps) {
            normalizedMap.set(key, trimmed);
        }
    }
});

const uniqueLocations = Array.from(normalizedMap.values()).sort((a, b) => a.localeCompare(b, 'th'));
console.log(uniqueLocations);
