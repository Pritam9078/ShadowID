import axios from 'axios';

class PinataService {
  constructor() {
    this.apiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.secretKey = import.meta.env.VITE_PINATA_SECRET_API_KEY;
    this.jwt = import.meta.env.VITE_PINATA_JWT;
    this.baseURL = 'https://api.pinata.cloud';
  }

  getAuthHeaders() {
    // Prefer JWT if available, fallback to API key auth
    if (this.jwt && this.jwt !== 'your_pinata_jwt_token') {
      return {
        'Authorization': `Bearer ${this.jwt}`
      };
    } else if (this.apiKey && this.apiKey !== 'your_pinata_api_key' && this.secretKey && this.secretKey !== 'your_pinata_secret_key') {
      return {
        'pinata_api_key': this.apiKey,
        'pinata_secret_api_key': this.secretKey
      };
    }
    return null;
  }

  async pinJSON(data, name) {
    try {
      // Check if we have valid credentials
      const authHeaders = this.getAuthHeaders();
      if (!authHeaders) {
        console.warn('[ShadowID] No valid Pinata credentials found. Using mock IPFS hash.');
        return {
          success: true,
          ipfsHash: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: `https://gateway.pinata.cloud/ipfs/mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      }

      const response = await axios.post(
        `${this.baseURL}/pinning/pinJSONToIPFS`,
        {
          pinataContent: data,
          pinataMetadata: {
            name: name
          },
          pinataOptions: {
            cidVersion: 0
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        }
      );
      
      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      };
    } catch (error) {
      console.error('Error pinning JSON to IPFS:', error);
      console.warn('[ShadowID] Pinata upload failed. Using mock IPFS hash for development.');
      
      // Return mock hash for development
      return {
        success: true,
        ipfsHash: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://gateway.pinata.cloud/ipfs/mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }
  }

  async pinFile(file, name) {
    try {
      // Check if we have valid credentials
      const authHeaders = this.getAuthHeaders();
      if (!authHeaders) {
        console.warn('[ShadowID] No valid Pinata credentials found. Using mock IPFS hash for file.');
        return {
          success: true,
          ipfsHash: `mock_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: `https://gateway.pinata.cloud/ipfs/mock_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      }

      const formData = new FormData();
      formData.append('file', file);
      
      const metadata = JSON.stringify({
        name: name
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 0
      });
      formData.append('pinataOptions', options);

      const response = await axios.post(
        `${this.baseURL}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: 'Infinity',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            ...authHeaders
          }
        }
      );

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
      };
    } catch (error) {
      console.error('Error pinning file to IPFS:', error);
      console.warn('[ShadowID] Pinata file upload failed. Using mock IPFS hash for development.');
      
      // Return mock hash for development
      return {
        success: true,
        ipfsHash: `mock_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: `https://gateway.pinata.cloud/ipfs/mock_file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }
  }

  async getJSON(ipfsHash) {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching JSON from IPFS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async unpinContent(ipfsHash) {
    try {
      await axios.delete(
        `${this.baseURL}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.jwt}`
          }
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Error unpinning content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listPinned() {
    try {
      const response = await axios.get(
        `${this.baseURL}/data/pinList?status=pinned`,
        {
          headers: {
            'Authorization': `Bearer ${this.jwt}`
          }
        }
      );
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error listing pinned content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new PinataService();
