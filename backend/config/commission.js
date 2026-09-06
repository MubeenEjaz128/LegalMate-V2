let commissionPercentage = 10; // Default 10% admin commission

module.exports = {
  getCommission: () => commissionPercentage,
  setCommission: (value) => { commissionPercentage = value; },
}; 