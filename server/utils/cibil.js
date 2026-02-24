/**
 * simulateCibil — auto-assigns a realistic CIBIL score on registration.
 * Score range: 300–900
 */
const simulateCibil = ({ employmentType, monthlyIncome, dateOfBirth }) => {
    let score = 650; // base

    // Employment type bonus
    const empMap = {
        Salaried: 60, 'Self-Employed': 25, Business: 40,
        Retired: 10, Student: -30, Unemployed: -60,
    };
    score += empMap[employmentType] || 0;

    // Monthly income bonus
    const income = Number(monthlyIncome) || 0;
    if (income >= 100000) score += 90;
    else if (income >= 50000) score += 60;
    else if (income >= 25000) score += 30;
    else if (income < 10000) score -= 40;

    // Age bonus (25–55 is the sweet spot)
    if (dateOfBirth) {
        const age = Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 3600 * 1000));
        if (age >= 25 && age <= 55) score += 25;
        else if (age < 22) score -= 30;
    }

    // Add small random variation (±30) so scores aren't identical
    score += Math.floor(Math.random() * 61) - 30;

    return Math.min(900, Math.max(300, score));
};

module.exports = { simulateCibil };
