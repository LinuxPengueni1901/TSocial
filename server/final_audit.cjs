const Database = require('better-sqlite3');
const db = new Database('tsocial.db');

async function test() {
    const handle = 'audit_' + Date.now();
    console.log(`Phase 1: Creating user @${handle}...`);
    db.prepare('INSERT INTO users (name, handle, password) VALUES (?, ?, ?)').run('Audit User', handle, 'pass');

    let user = db.prepare('SELECT id, handle FROM users WHERE handle = ?').get(handle);
    console.log("Found user:", user);

    console.log(`Phase 2: Suspending user ID ${user.id}...`);
    // Exact logic from index.js
    const reason = "Audit test";
    const adminHandle = "tsocial";
    db.prepare('UPDATE users SET is_suspended = 1, suspension_reason = ?, suspended_by = ? WHERE id = ?').run(reason, adminHandle, user.id);
    console.log("Update executed.");

    console.log("Phase 3: Final verification...");
    const final = db.prepare('SELECT id, handle, is_suspended FROM users WHERE id = ?').get(user.id);
    if (final) {
        console.log("User still exists in DB:", final);
    } else {
        console.log("ERROR: User is MISSING from DB!");
    }
}

test();
