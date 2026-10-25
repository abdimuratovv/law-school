export default class LoadReporter {
  onTestCaseResult(testCase) {
    const result = testCase.meta().loadResult;
    if (result) console.log('EXAM_LOAD_RESULT ' + JSON.stringify(result));
  }
}
