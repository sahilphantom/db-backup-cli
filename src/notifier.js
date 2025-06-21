const axios = require('axios');

function notifySlack(msg) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  return axios.post(webhook, { text: msg });
}

module.exports = { notifySlack };