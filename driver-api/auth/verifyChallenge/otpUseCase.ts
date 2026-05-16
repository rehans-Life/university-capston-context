export default class UseCase {
  async exec(challenge: string, answerChallenge: string) {
    return challenge === answerChallenge;
  }
}
