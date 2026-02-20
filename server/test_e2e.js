const API_URL = 'http://localhost:5000/api';
// We assume we can create an admin or there's a secret.
const ADMIN_SECRET = 'bhrtln24';

async function runTests() {
    console.log('--- STARTING END-TO-END WORKFLOW TEST ---');
    try {
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
            body: JSON.stringify({ username: applicantData.username, password: 'password123' })
        });
        if (!res.ok) throw new Error(await res.text());
        const appToken = (await res.json()).token;
        console.log('✅ Applicant logged in');

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

        console.log('\n--- 3. Admin (Officer) Registration & Login ---');
        const adminData = {
            username: `admin_${Date.now()}`,
            password: 'password123',
            email: `admin_${Date.now()}@test.com`,
            fullName: 'E2E Admin',
            role: 'admin',
            adminSecret: ADMIN_SECRET,
            officerBank: 'SBI'
        };
        res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminData)
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Admin registered');

        res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminData.username, password: 'password123' })
        });
        if (!res.ok) throw new Error(await res.text());
        const adminToken = (await res.json()).token;
        console.log('✅ Admin logged in');

        console.log('\n--- 4. Officer Review -> Branch Review ---');
        res = await fetch(`${API_URL}/loans/${loanId}/officer-review`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ action: 'approved', remarks: 'Looks good' })
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Loan approved by officer (Moved to Branch Review)');

        console.log('\n--- 5. Branch Manager Review -> Sanctioned ---');
        res = await fetch(`${API_URL}/loans/${loanId}/manager-review`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ action: 'approved', remarks: 'Sanctioned' })
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Loan sanctioned by branch manager');

        console.log('\n--- 6. Officer Disbursal ---');
        res = await fetch(`${API_URL}/loans/${loanId}/disburse`, {
            method: 'PUT', headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (!res.ok) throw new Error(await res.text());
        console.log('✅ Loan disbursed successfully! EMI generated.');

        console.log('\n🎉 ALL E2E FLOWS COMPLETED SUCCESSFULLY! 🎉\n');

    } catch (err) {
        console.error('\n❌ E2E TEST FAILED:', err.message);
    }
}
runTests();
