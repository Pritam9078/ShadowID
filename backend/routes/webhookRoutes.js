/**
 * Alchemy Webhook Integration for DVote DAO
 * 
 * Handles real-time blockchain events via Alchemy webhooks
 * Replaces polling with push notifications for better performance
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
// Temporarily disabled
// const analyticsService = require('../services/analyticsService');

// Webhook configuration
const WEBHOOK_CONFIG = {
  // Your Alchemy webhook signing key (from dashboard)
  signingKey: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY,
  
  // Expected webhook types
  types: {
    ADDRESS_ACTIVITY: 'ADDRESS_ACTIVITY',
    MINED_TRANSACTION: 'MINED_TRANSACTION',
    DROPPED_TRANSACTION: 'DROPPED_TRANSACTION'
  }
};

/**
 * Verify webhook signature from Alchemy
 */
function verifyWebhookSignature(body, signature, timestamp) {
  if (!WEBHOOK_CONFIG.signingKey) {
    console.warn('No webhook signing key configured');
    return false;
  }

  const payload = timestamp + body;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_CONFIG.signingKey)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Main webhook handler for Alchemy events
 */
router.post('/alchemy-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('X-Alchemy-Signature');
    const timestamp = req.get('X-Timestamp');
    
    // Verify webhook authenticity
    if (!verifyWebhookSignature(req.body.toString(), signature, timestamp)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhook = JSON.parse(req.body);
    console.log('Received Alchemy webhook:', webhook.type);

    // Process different webhook types
    switch (webhook.type) {
      case WEBHOOK_CONFIG.types.ADDRESS_ACTIVITY:
        await handleAddressActivity(webhook);
        break;
        
      case WEBHOOK_CONFIG.types.MINED_TRANSACTION:
        await handleMinedTransaction(webhook);
        break;
        
      case WEBHOOK_CONFIG.types.DROPPED_TRANSACTION:
        await handleDroppedTransaction(webhook);
        break;
        
      default:
        console.log('Unknown webhook type:', webhook.type);
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Handle address activity webhooks (DAO contract interactions)
 */
async function handleAddressActivity(webhook) {
  const { event } = webhook;
  
  for (const activity of event.activity) {
    const { fromAddress, toAddress, value, asset, hash, blockNum } = activity;
    
    // Check if this involves our DAO contracts
    const isDAOTransaction = isDAORelatedAddress(toAddress) || isDAORelatedAddress(fromAddress);
    
    if (isDAOTransaction) {
      console.log('DAO transaction detected:', hash);
      
      // Update analytics - temporarily disabled
      // await analyticsService.recordTransaction({
      //   hash,
      //   from: fromAddress,
      //   to: toAddress,
      //   value,
      //   asset,
      //   blockNumber: parseInt(blockNum, 16),
      //   type: 'dao_activity'
      // });
      
      // Broadcast to WebSocket clients
      broadcastToRoom('dao-updates', {
        type: 'transaction',
        data: {
          hash,
          from: fromAddress,
          to: toAddress,
          value,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

/**
 * Handle mined transaction webhooks
 */
async function handleMinedTransaction(webhook) {
  const { event } = webhook;
  const { transaction } = event;
  
  console.log('Transaction mined:', transaction.hash);
  
  // Update transaction status in database - temporarily disabled
  // await analyticsService.updateTransactionStatus(transaction.hash, 'confirmed');
  
  // Notify WebSocket clients
  broadcastToRoom('transaction-updates', {
    type: 'transaction_confirmed',
    data: {
      hash: transaction.hash,
      blockNumber: parseInt(transaction.blockNumber, 16),
      status: 'confirmed'
    }
  });
}

/**
 * Handle dropped transaction webhooks
 */
async function handleDroppedTransaction(webhook) {
  const { event } = webhook;
  const { transaction } = event;
  
  console.log('Transaction dropped:', transaction.hash);
  
  // Update transaction status - temporarily disabled
  // await analyticsService.updateTransactionStatus(transaction.hash, 'failed');
  
  // Notify WebSocket clients
  broadcastToRoom('transaction-updates', {
    type: 'transaction_failed',
    data: {
      hash: transaction.hash,
      status: 'failed'
    }
  });
}

/**
 * Check if address is related to DAO contracts
 */
function isDAORelatedAddress(address) {
  const daoAddresses = [
    process.env.DAO_CONTRACT_ADDRESS,
    process.env.GOVERNANCE_TOKEN_ADDRESS,
    process.env.TREASURY_ADDRESS,
    process.env.ZK_VERIFIER_ADDRESS
  ].filter(Boolean);
  
  return daoAddresses.includes(address?.toLowerCase());
}

// Import broadcastToRoom function (you'll need this from your server.js)
let broadcastToRoom;

// Set broadcast function from main server
function setBroadcastFunction(fn) {
  broadcastToRoom = fn;
}

module.exports = {
  router,
  setBroadcastFunction,
  WEBHOOK_CONFIG
};