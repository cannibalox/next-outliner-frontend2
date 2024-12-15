const getTrans = (labels: Record<string, string>, locale: string) => {
  return labels[locale] || labels.en_US || labels.zh || Object.values(labels)[0];
};

export default getTrans;
