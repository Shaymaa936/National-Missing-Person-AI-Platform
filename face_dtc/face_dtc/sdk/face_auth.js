/**
 * MissingPersonsFinder SDK - Integrate Missing Persons AI Facial Identification into any website.
 * Usage:
 *   const finder = new MissingPersonsFinder({ serverUrl: 'http://localhost:8000' });
 *   const results = await finder.search(base64Image);
 */
(function (global) {
  class MissingPersonsFinder {
    constructor(config = {}) {
      this.serverUrl = (config.serverUrl || 'http://localhost:8000').replace(/\/$/, '');
    }

    /**
     * Search missing persons database by base64 image or video frame
     */
    async search(base64Image, topK = 5, threshold = 0.30) {
      try {
        const response = await fetch(`${this.serverUrl}/api/missing/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image, top_k: topK, threshold: threshold })
        });
        return await response.json();
      } catch (err) {
        console.error('[MissingPersonsSDK] Search error:', err);
        return { success: false, error: err.message, results: [] };
      }
    }

    /**
     * Fetch list of active missing person cases
     */
    async getCases(statusFilter = 'missing', query = '') {
      try {
        const url = `${this.serverUrl}/api/missing/cases?status=${encodeURIComponent(statusFilter)}&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        return await response.json();
      } catch (err) {
        console.error('[MissingPersonsSDK] Fetch cases error:', err);
        return { success: false, cases: [] };
      }
    }

    /**
     * Log a sighting report when a missing person is identified
     */
    async reportSighting(caseId, location, notes, reporterContact, base64Image = null) {
      try {
        const response = await fetch(`${this.serverUrl}/api/missing/sighting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            case_id: caseId,
            location: location,
            notes: notes,
            reporter_contact: reporterContact,
            image: base64Image
          })
        });
        return await response.json();
      } catch (err) {
        console.error('[MissingPersonsSDK] Report sighting error:', err);
        return { success: false, error: err.message };
      }
    }
  }

  global.MissingPersonsFinder = MissingPersonsFinder;
})(typeof window !== 'undefined' ? window : this);
