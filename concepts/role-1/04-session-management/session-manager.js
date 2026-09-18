// session-manager.js
// Handles persistence, resume, and fork for agent sessions.
// Uses file system for simplicity — swap for Redis/PostgreSQL in production.

import fs from "fs"
import path from "path"

const SESSIONS_DIR = "./sessions"
fs.mkdirSync(SESSIONS_DIR, { recursive: true })

export class SessionManager {

    constructor(sessionId) {
        this.sessionId = sessionId
        this.filePath = path.join(SESSIONS_DIR, `${sessionId}.json`)
        this.state = {
            sessionId,
            created_at: new Date().toISOString(),
            last_updated: null,
            turn_count: 0,
            messages: [],
            metadata: {}
        }
    }

    // Save current state to disk
    save() {
        this.state.last_updated = new Date().toISOString()
        fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2))
        console.log(`[Session] Saved: ${this.sessionId} (${this.state.messages.length} messages)`)
    }

    // Load prior state from disk
    load() {
        if (!fs.existsSync(this.filePath)) return false
        this.state = JSON.parse(fs.readFileSync(this.filePath, "utf8"))
        console.log(`[Session] Loaded: ${this.sessionId} (${this.state.messages.length} messages, last updated: ${this.state.last_updated})`)
        return true
    }

    // Check if a session exists
    exists() {
        return fs.existsSync(this.filePath)
    }

    // Add a message and save
    appendMessage(message) {
        this.state.messages.push(message)
        this.state.turn_count++
        this.save()
    }

    // Append multiple messages at once
    appendMessages(messages) {
        this.state.messages.push(...messages)
        this.state.turn_count += messages.length
        this.save()
    }

    // Get messages for API call
    getMessages() {
        return this.state.messages
    }

    // Fork: create a new independent session from current state
    fork(newSessionId) {
        const forked = new SessionManager(newSessionId)
        forked.state = JSON.parse(JSON.stringify(this.state)) // deep copy
        forked.state.sessionId = newSessionId
        forked.state.created_at = new Date().toISOString()
        forked.state.last_updated = null
        forked.filePath = path.join(SESSIONS_DIR, `${newSessionId}.json`)
        forked.save()
        console.log(`[Session] Forked: ${this.sessionId} → ${newSessionId}`)
        return forked
    }

    // Set metadata
    setMetadata(key, value) {
        this.state.metadata[key] = value
        this.save()
    }

    // Clean up
    delete() {
        if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath)
        console.log(`[Session] Deleted: ${this.sessionId}`)
    }

    getSummary() {
        return {
            sessionId: this.state.sessionId,
            created_at: this.state.created_at,
            last_updated: this.state.last_updated,
            turn_count: this.state.turn_count,
            message_count: this.state.messages.length
        }
    }
}