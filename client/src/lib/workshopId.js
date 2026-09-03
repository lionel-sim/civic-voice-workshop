const WORKSHOP_ID_PATTERN = /^[STFG]\d{7}[A-Z]$/;

export function isWorkshopId(value) {
  return WORKSHOP_ID_PATTERN.test(value);
}
