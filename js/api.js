/**
 * Unified Backend API Service Layer
 * Clean async fetch wrappers with error handling and Private Network Access support.
 */
window.API = {
    getBaseUrl() {
        return window.APP_CONFIG.API_BASE;
    },

    async request(endpoint, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), window.APP_CONFIG.API_TIMEOUT_MS);
        config.signal = controller.signal;

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            if (!response.ok) {
                let errDetail = `HTTP ${response.status} ${response.statusText}`;
                try {
                    const errJson = await response.json();
                    if (errJson && errJson.detail) {
                        errDetail = errJson.detail;
                    }
                } catch (e) {}
                throw new Error(errDetail);
            }

            return await response.json();
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                throw new Error(`Request timed out after ${window.APP_CONFIG.API_TIMEOUT_MS / 1000}s`);
            }
            console.error(`[API Error] ${endpoint}:`, err);
            throw err;
        }
    },

    // Health check
    async healthCheck() {
        return await this.request('/api/health');
    },

    // TTS Services
    async getVoices() {
        return await this.request('/api/tts/voices');
    },

    async parseSpeaker(name) {
        return await this.request(`/api/tts/parse-speaker?name=${encodeURIComponent(name)}`);
    },

    async synthesizeBatchDialogue(payload) {
        return await this.request('/api/tts/batch-dialogue', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async synthesizeSingle(payload) {
        return await this.request('/api/tts/synthesize-single', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // CBT Exams Management
    async getExams() {
        return await this.request('/api/exams');
    },

    async getExam(examId) {
        return await this.request(`/api/exams/${encodeURIComponent(examId)}`);
    },

    async saveExam(examId, title, examData) {
        return await this.request('/api/exams', {
            method: 'POST',
            body: JSON.stringify({
                exam_id: examId,
                title: title,
                exam_data: examData
            })
        });
    },

    async deleteExam(examId) {
        return await this.request(`/api/exams/${encodeURIComponent(examId)}`, {
            method: 'DELETE'
        });
    },

    // Exam Submissions & Results
    async submitExam(payload) {
        return await this.request('/api/submit-exam', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async getSubmissions(limit = 100, offset = 0) {
        return await this.request(`/api/submissions?limit=${limit}&offset=${offset}`);
    },

    async getLatestSubmission() {
        return await this.request('/api/submissions/latest');
    },

    async getSubmissionDetails(subId) {
        return await this.request(`/api/submissions/${subId}`);
    },

    getDownloadUrl(subId, format = 'json') {
        return `${this.getBaseUrl()}/api/submissions/${subId}/download?format=${format}`;
    }
};
