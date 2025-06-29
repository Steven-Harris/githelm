const units = [
  { label: 'd', mod: 86400 },
  { label: 'h', mod: 3600 },
  { label: 'm', mod: 60 },
  { label: 's', mod: 1 },
];

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  let seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  return units
    .reduce((acc, { label, mod }) => {
      const unitValue = Math.floor(seconds / mod);
      seconds %= mod;
      return unitValue > 0 ? `${acc} ${unitValue}${label}` : acc;
    }, '')
    .trim();
}

export function timeAgoInSeconds(seconds: number): string {
  return units
    .reduce((acc, { label, mod }) => {
      const unitValue = Math.floor(seconds / mod);
      seconds %= mod;
      return unitValue > 0 ? `${acc} ${unitValue}${label}` : acc;
    }, '')
    .trim();
}
