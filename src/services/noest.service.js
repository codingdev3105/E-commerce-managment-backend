const axios = require('axios');

class NoestService {
    constructor() {
        this.baseURL = 'https://app.noest-dz.com/api/public';
        this.apiToken = process.env.NOEST_API_TOKEN;
        this.userGuid = process.env.NOEST_USER_GUID;

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Helper to handle API requests
     * Automatically injects api_token and user_guid into the body
     */
    async _request(method, url, data = {}, config = {}) {
        try {
            // Inject credentials into the request body
            const payload = {
                api_token: this.apiToken,
                user_guid: this.userGuid,
                ...data
            };

            console.log(`🔵 Noest API Request [${method} ${url}]:`, JSON.stringify(payload, null, 2));

            const response = await this.client.request({
                method,
                url,
                data: payload,
                ...config
            });

            console.log(`✅ Noest API Response [${method} ${url}]:`, response.data);
            return response.data;
        } catch (error) {
            console.error(`❌ NoestService Error [${method} ${url}]:`, error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message || 'Erreur API Noest');
        }
    }

    // 1️⃣ createOrder(data)
    async createOrder(data) {
        // Validation basique des champs obligatoires pourrait être faite ici
        return this._request('POST', '/create/order', data);
    }

    // 2️⃣ validateOrder(tracking)
    async validateOrder(tracking) {
        return this._request('POST', '/valid/order', { tracking });
    }

    // 3️⃣ updateOrder(tracking, data)
    async updateOrder(tracking, data) {
        return this._request('POST', '/update/order', { tracking, ...data });
    }

    // 4️⃣ deleteOrder(tracking)
    async deleteOrder(tracking) {
        return this._request('POST', '/delete/order', { tracking });
    }

    // 5️⃣ addRemark(tracking, content)
    async addRemark(tracking, content) {
        return this._request('POST', '/add/maj', { tracking, content });
    }

    // 6️⃣ askNewTentative(tracking)
    async askNewTentative(tracking) {
        return this._request('POST', '/ask/new-tentative', { tracking });
    }

    // 7️⃣ askReturn(tracking)
    async askReturn(tracking) {
        return this._request('POST', '/ask/return', { tracking });
    }

    // 8️⃣ downloadLabel(tracking)
    async downloadLabel(tracking) {
        try {
            const response = await this.client.get('/get/order/label', {
                params: {
                    tracking,
                    api_token: this.apiToken,
                    user_guid: this.userGuid
                },
                responseType: 'arraybuffer' // Important pour le PDF
            });
            return response.data;
        } catch (error) {
            console.error(`NoestService Error [GET LABEL]:`, error.message);
            throw new Error('Impossible de télécharger l\'étiquette');
        }
    }

    // 9️⃣ getTrackingsInfo(trackingsArray)
    async getTrackingsInfo(trackingsArray) {
        // L'API attend probablement un format spécifique, ex: { trackings: [...] }
        // Le prompt dit params: trackingsArray. On envoie souvent sous forme d'objet.
        // Supposons { trackings: [...] } ou le tableau direct selon doc. 
        // Par sécurité, on envoie souvent { trackings: [...] } mais le prompt implique juste l'array.
        // Je vais wrapper dans un objet si c'est POST.
        return this._request('POST', '/get/trackings/info', { trackings: trackingsArray });
    }

    // 🔟 getDesks()
    async getDesks() {
        return this._request('POST', '/desks');
    }

    // 1️⃣1️⃣ getFees()
    async getFees() {
        return this._request('POST', '/fees');
    }

    // 1️⃣2️⃣ getCommunes(wilaya_id)
    async getCommunes(wilaya_id = null) {
        const payload = wilaya_id ? { wilaya_id } : {};
        return this._request('POST', '/get/communes', payload);
    }

    // 1️⃣3️⃣ getWilayas()
    async getWilayas() {
        return this._request('POST', '/get/wilayas');
    }
}

module.exports = new NoestService();
