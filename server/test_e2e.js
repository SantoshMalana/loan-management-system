const API_URL = 'http://localhost:5000/api';
const mongoose = require('mongoose');
require('dotenv').config();

async function getOtpFromDb(userId) {
    const user = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId(userId) });
    return user ? user.otp : null;
}

async function runTests() {
    console.log('--- STARTING END-TO-END WORKFLOW TEST ---');
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/loan-management-system');

        console.log('\n--- 1. Applicant Registration & Login ---');
        const applicantData = {
            username: `user_${Date.now()}`,
            password: 'password123',
            email: `user_${Date.now()}@test.com`,
            fullName: 'E2E Applicant',
            phone: '9999999999',
            role: 'applicant',
            monthlyIncome: 65000,
            cibilScore: 780
        };

        let res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicantData)
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Applicant registered');

        res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: applicantData.username, password: 'password123', portalType: 'applicant' })
        });
        if (!res.ok) throw new Error(await res.text());
        const loginRes = await res.json();

        const appOtp = await getOtpFromDb(loginRes.userId);

        res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: loginRes.userId, otp: appOtp })
        });
        if (!res.ok) throw new Error(await res.text());
        const appToken = (await res.json()).token;

        console.log('✅ Applicant logged in (OTP Verified)');

        console.log('\n--- 2. Applicant Submits Loan ---');
        const loanPayload = {
            loanType: 'Personal', bankName: 'SBI', purpose: 'Emergency', amount: 500000, termMonths: 24,
            documents: { aadhaarSubmitted: true, panSubmitted: true, photograph: true, incomeProof: true, bankStatement: true }
        };
        res = await fetch(`${API_URL}/loans`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appToken}` },
            body: JSON.stringify(loanPayload)
        });
        if (!res.ok) throw new Error(await res.text());
        const loanId = (await res.json())._id;
        console.log('✅ Loan submitted, ID:', loanId);

        console.log('\n--- 3. Bank Manager Login ---');
        // We use a pre-seeded Branch Manager
        // Ensure you have a BM seeded. E.g username: bm_sbi, password: Password123
        const BM_USERNAME = 'bm_sbi';
        const BM_PASSWORD = 'Password123';

        res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: BM_USERNAME, password: BM_PASSWORD, portalType: 'staff', bank: 'SBI' })
        });
        if (!res.ok) throw new Error(`BM login failed: ${await res.text()}. Ensure a Bank Manager is seeded!`);

        const bmLoginRes = await res.json();
        const bmOtp = await getOtpFromDb(bmLoginRes.userId);

        res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            // Hardcoding staffSecretCode 'ALPHA123' assuming seed script sets it
            body: JSON.stringify({ userId: bmLoginRes.userId, otp: bmOtp, secretCode: 'ALPHA123' })
        });
        if (!res.ok) throw new Error(`BM OTP Verification failed: ${await res.text()}`);
        const bmToken = (await res.json()).token;
        console.log('✅ Bank Manager logged in (OTP + Secret Verified)');

        console.log('\n--- 4. BM Review -> Sanctioned ---');
        res = await fetch(`${API_URL}/loans/${loanId}/bm-review`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bmToken}` },
            body: JSON.stringify({ action: 'approved', remarks: 'Looks good to BM' })
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Loan sanctioned by Branch Manager');

        console.log('\n--- 5. BM Disbursal ---');
        res = await fetch(`${API_URL}/loans/${loanId}/disburse`, {
            method: 'PUT', headers: { 'Authorization': `Bearer ${bmToken}` }
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Loan disbursed successfully! EMI generated.');

        console.log('\n🎉 ALL E2E FLOWS COMPLETED SUCCESSFULLY! 🎉\n');

    } catch (err) {
        console.error('\n❌ E2E TEST FAILED:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}
runTests();
