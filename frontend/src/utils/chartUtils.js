export const addSMAData = (history) => {
  if (!history) return [];
  return history.map((point, index) => {
    const start = Math.max(0, index - 4);
    const subset = history.slice(start, index + 1);
    const avg = subset.reduce((acc, curr) => acc + curr.price, 0) / subset.length;
    return { ...point, sma: avg.toFixed(2) };
  });
};