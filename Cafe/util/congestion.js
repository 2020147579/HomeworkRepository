function calculateCongestion(M, remainingSeats, a) {
    const filled = M - remainingSeats;
    const ratio = a * filled / M;

    if (ratio < 0.2) return "매우 한산";
    if (ratio < 0.4) return "한산";
    if (ratio < 0.6) return "보통";
    if (ratio < 0.8) return "혼잡";
    return "매우 혼잡";
}

module.exports = { calculateCongestion };
