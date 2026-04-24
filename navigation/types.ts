export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type CandidateTabParamList = {
  Matches: undefined;
  Profile: undefined;
};

export type CandidateStackParamList = {
  MatchList: undefined;
  MatchDetail: { matchId: string };
};

export type EmployerTabParamList = {
  Jobs: undefined;
  Profile: undefined;
};

export type EmployerStackParamList = {
  JobList: undefined;
  Pipeline: { jobId: string; jobTitle: string };
  CandidateDetail: { matchId: string; jobTitle: string };
};
