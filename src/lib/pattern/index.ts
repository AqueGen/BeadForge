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

// Ball pattern functions
export {
  createBallPattern,
  getAllWedges,
  getWedgeByIndex,
  getWedgeWidthAtRow,
  getWedgeRowOffset,
  getWedgeAtPosition,
  isPositionInWedge,
  getBallPatternBead,
  setBallPatternBead,
  countBallPatternBeads,
  countBallBeadsByColor,
  generateBallBeadListForTTS,
  getHighlightedBeadsForBall,
  ballPatternToDto,
  dtoToBallPattern,
  copyWedge,
  copyWedgeToAll,
  mirrorWedgeHorizontally,
} from './ballPattern';

// Ball pattern drawing tools
export {
  floodFillBallPattern,
  drawLineBallPattern,
  drawRectangleBallPattern,
} from './ballDrawing';

// JBead .jbb file format support
export {
  parseJBB,
  jbbToBeadPattern,
  beadPatternToJBB,
  loadJBB,
  saveJBB,
  downloadJBB,
  // Ball pattern JBB support
  isJBBBallPattern,
  jbbToBallPattern,
  ballPatternToJBB,
  loadJBBBall,
  saveJBBBall,
  downloadJBBBall,
  type JBBData,
} from './jbbFormat';
