const axios = require("axios");

/**
 * CNIC verification with NADRA.
 *
 * NADRA gives verification access (e.g. its Verisys service) to approved
 * organisations under an agreement. Once you have it, set in backend/.env:
 *   NADRA_API_URL=<endpoint NADRA gives you>
 *   NADRA_API_KEY=<your key>
 * and adapt the request body / response check below to NADRA's spec.
 *
 * Until then every CNIC stays "pending" and an admin can mark it verified
 * from Users & Roles. Never throws, so signup never breaks.
 *
 * @returns {Promise<{status: "verified"|"failed"|"pending", reason?: string}>}
 */
async function verifyCnic({ cnic, name }) {
  const url = process.env.NADRA_API_URL;
  const key = process.env.NADRA_API_KEY;

  if (!url || !key) {
    return { status: "pending", reason: "NADRA verification not configured" };
  }

  try {
    // ADAPT: request format to NADRA's documentation
    const { data } = await axios.post(
      url,
      { cnic, name },
      { headers: { Authorization: `Bearer ${key}` }, timeout: 10000 }
    );

    // ADAPT: how NADRA reports a match
    if (data && data.verified === true) return { status: "verified" };
    if (data && data.verified === false) return { status: "failed" };
    return { status: "pending", reason: "Unexpected NADRA response" };
  } catch (error) {
    console.error("[nadraService] verification failed:", error.message);
    return { status: "pending", reason: error.message };
  }
}

module.exports = { verifyCnic };
