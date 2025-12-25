// File: src/services/computedChannels/dataPreparation.js
// Single Responsibility: Convert and prepare data for worker

/**
 * Extract and validate data sources
 */
export const extractDataSources = (dataObj, cfgData) => {
  const analogArray = Array.isArray(dataObj?.analogData) ? dataObj.analogData : [];
  const digitalArray = Array.isArray(dataObj?.digitalData) ? dataObj.digitalData : [];
  
  return {
    analogArray,
    digitalArray,
    sampleCount: analogArray?.[0]?.length || 0
  };
};

/**
 * Convert arrays to ArrayBuffers (transferable objects)
 */
export const convertToTransferableBuffers = (analogArray, digitalArray) => {
  const analogBuffers = [];
  const transferableObjects = [];

  // Convert analog channels
  for (let i = 0; i < analogArray.length; i++) {
    const buffer = new Float64Array(analogArray[i]).buffer;
    analogBuffers.push(buffer);
    transferableObjects.push(buffer);
  }

  // Convert digital channels
  const digitalBuffers = [];
  for (let i = 0; i < digitalArray.length; i++) {
    const buffer = new Float64Array(digitalArray[i]).buffer;
    digitalBuffers.push(buffer);
    transferableObjects.push(buffer);
  }

  return {
    analogBuffers,
    digitalBuffers,
    transferableObjects
  };
};

/**
 * Extract and serialize channel metadata
 */
export const serializeChannelMetadata = (cfgData) => {
  const analogChannelsMeta = (cfgData?.analogChannels || []).map((ch) => ({
    id: ch.id,
    ph: ch.ph,
    units: ch.units,
  }));

  const digitalChannelsMeta = (cfgData?.digitalChannels || []).map((ch) => ({
    id: ch.id,
    ph: ch.ph,
    units: ch.units,
  }));

  return {
    analogChannelsMeta,
    digitalChannelsMeta
  };
};

/**
 * Build worker task payload
 */
export const buildWorkerTask = (
  mathJsExpr,
  analogBuffers,
  digitalBuffers,
  analogChannelsMeta,
  digitalChannelsMeta,
  sampleCount,
  analogArray,
  digitalArray
) => {
  return {
    mathJsExpr,
    analogBuffers,
    digitalBuffers,
    analogChannels: analogChannelsMeta,
    digitalChannels: digitalChannelsMeta,
    sampleCount,
    analogCount: analogArray.length,
    digitalCount: digitalArray.length
  };
};
