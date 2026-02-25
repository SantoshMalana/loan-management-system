/**
 * Simulates a CIBIL score (300–900) based on user profile.
 * In real banking systems this would call an actual CIBIL/Experian API.
 */
const simulateCibil = ({ employmentType, monthlyIncome, dateOfBirth }) => {
    let score = 650; // base score

    // Employment type factor
    const empBonus = {
        'Salaried': 80,
        'Business': 50,
        'Self-Employed': 30,
        'Student': -50,
        'Unemployed': -100,
    };
    score += empBonus[employmentType] || 0;

    // Income factor
    if (monthlyIncome) {
        const inc = Number(monthlyIncome);
        if (inc >= 100000) score += 80;
        else if (inc >= 50000) score += 50;
        else if (inc >= 25000) score += 25;
        else if (inc >= 15000) score += 10;
        else score -= 20;
    }

    // Age factor (from DOB)
    if (dateOfBirth) {
        const age = Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 3600 * 1000));
        if (age >= 30 && age <= 55) score += 40;
        else if (age >= 25) score += 20;
        else if (age < 22) score -= 30;
    }

    // Add small randomness for realism (±30)
    score += Math.floor(Math.random() * 61) - 30;

    // Clamp between 300 and 900
    return Math.max(300, Math.min(900, score));
};

module.exports = { simulateCibil };