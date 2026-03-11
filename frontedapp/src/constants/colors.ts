// ZeliaOMS / McDave brand palette
// Primary Green: #2D8659  |  Secondary Gold: #F7B801  |  Accent Colors
export const Colors = {
  // ── Primary brand: McDave Green ────────────────────────────────
  primary:        '#2D8659',
  primaryLight:   '#4BA076',
  primaryDark:    '#1F5D3F',
  primarySurface: '#E6F3EC',

  // ── Accent: McDave Gold (CTAs, badges, highlights) ─────────────
  accent:         '#F7B801',
  accentLight:    '#FCC566',
  accentDark:     '#D4930A',
  accentSurface:  '#FFF9E6',

  // ── Gold (secondary highlights) ────────────────────────────────
  gold:           '#F7B801',
  goldSurface:    '#FFF9E6',

  // ── Semantic ───────────────────────────────────────────────────
  success:        '#2D8659',
  successLight:   '#4BA076',
  successSurface: '#E6F3EC',

  warning:        '#D4730A',
  warningLight:   '#F39C12',
  warningSurface: '#FEF5E4',

  error:          '#C0392B',
  errorLight:     '#E74C3C',
  errorSurface:   '#FDEDEC',

  info:           '#2D8659',
  infoSurface:    '#E6F3EC',

  // ── Neutral ────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',

  gray50:  '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // ── Text ───────────────────────────────────────────────────────
  textPrimary:   '#1A1A2E',
  textSecondary: '#6B7280',
  textDisabled:  '#BDBDBD',
  textInverse:   '#FFFFFF',

  // ── Background / Surface ───────────────────────────────────────
  background: '#F0F4F8',
  surface:    '#FFFFFF',
  divider:    '#E5E7EB',

  // ── Order / Payment status ─────────────────────────────────────
  statusPending:   '#F7B801',
  statusCompleted: '#2D8659',
  statusPartial:   '#4BA076',
  statusCancelled: '#C0392B',

  // ── Delivery status ────────────────────────────────────────────
  deliveryPending:   '#F7B801',
  deliveryInTransit: '#4BA076',
  deliveryDelivered: '#2D8659',
  deliveryCancelled: '#C0392B',

  // ── Tab bar ────────────────────────────────────────────────────
  tabBar:         '#FFFFFF',
  tabBarActive:   '#2D8659',
  tabBarInactive: '#9E9E9E',

  // ── Legacy aliases (keeps existing references compiling) ────────
  secondary:        '#2D8659',
  secondaryLight:   '#4BA076',
  secondarySurface: '#E6F3EC',
};

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const BorderRadius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  full: 9999,
};

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
};
