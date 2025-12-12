// Pattern core functions
export {
  createPattern,
  getBead,
  setBead,
  setBeads,
  clearPattern,
  resizePattern,
  mirrorHorizontal,
  mirrorVertical,
  getUsedHeight,
  patternToDto,
  dtoToPattern,
  updateColors,
} from './pattern';

// Calculations
export {
  correctPoint,
  calculateRepeat,
  countBeadsByColor,
  generateBeadList,
  calculateLength,
  calculateWeight,
  getPatternStats,
  positionToCoordinates,
  coordinatesToPosition,
  getHighlightedBeads,
} from './calculations';

// Drawing tools
export {
  floodFill,
  drawLine,
  drawRectangle,
  copyRegion,
  pasteSelection,
  isInSelection,
} from './drawing';

// Sample patterns (temporary until DB)
export {
  getSamplePatternList,
  getSamplePattern,
  type SamplePatternInfo,
} from './samplePatterns';

// JBead .jbb file format support
export {
  parseJBB,
  jbbToBeadPattern,
  beadPatternToJBB,
  loadJBB,
  saveJBB,
  downloadJBB,
  type JBBData,
} from './jbbFormat';
