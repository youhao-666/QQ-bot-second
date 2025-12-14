function runWhen(runFn, conditionFn) {
  const f = () => {
    if (!conditionFn()) {
      setTimeout(f, 100);
      return;
    }
    runFn();
  };
  setTimeout(f, 100);
}

function shuffleArray(A) {
  for (let i = A.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = A[i];
    A[i] = A[j];
    A[j] = t;
  }
}

exports.runWhen = runWhen;
exports.shuffleArray = shuffleArray;
