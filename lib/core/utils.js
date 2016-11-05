var Mode = require('./mode')
var GF = require('./galois-field')
var Polynomial = require('./polynomial')

var CODEWORDS_COUNT = [
  0, // Not used
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
]

module.exports = {
  G15 : (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
  G18 : (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
  G15_MASK : (1 << 14) | (1 << 12) | (1 << 10)  | (1 << 4) | (1 << 1),

  /**
   * Returns the QR Code size for the specified version
   *
   * @param  {Number} version QR Code version
   * @return {Number}         size of QR code
   */
  getSymbolSize: function getSymbolSize (version) {
    if (!version) throw new Error('"version" cannot be null or undefined')
    if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40')
    return version * 4 + 17
  },

  /**
   * Returns the total number of codewords used to store data and EC information.
   *
   * @param  {Number} version QR Code version
   * @return {Number}         Data length in bits
   */
  getSymbolTotalCodewords: function getSymbolTotalCodewords (version) {
    return CODEWORDS_COUNT[version]
  },

  getBCHTypeInfo : function(data) {
    var d = data << 10;
    while (this.getBCHDigit(d) - this.getBCHDigit(this.G15) >= 0) {
      d ^= (this.G15 << (this.getBCHDigit(d) - this.getBCHDigit(this.G15) ) );  
    }
    return ( (data << 10) | d) ^ this.G15_MASK;
  },

  getBCHTypeNumber : function(data) {
    var d = data << 12;
    while (this.getBCHDigit(d) - this.getBCHDigit(this.G18) >= 0) {
      d ^= (this.G18 << (this.getBCHDigit(d) - this.getBCHDigit(this.G18) ) );  
    }
    return (data << 12) | d;
  },

  getBCHDigit : function(data) {

    var digit = 0;

    while (data != 0) {
      digit++;
      data >>>= 1;
    }

    return digit;
  },

  getLostPoint : function(qrCode) {
    
    var moduleCount = qrCode.getModuleCount();
    
    var lostPoint = 0;
    
    // LEVEL1
    
    for (var row = 0; row < moduleCount; row++) {

      for (var col = 0; col < moduleCount; col++) {

        var sameCount = 0;
        var dark = qrCode.isDark(row, col);

      for (var r = -1; r <= 1; r++) {

          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }

          for (var c = -1; c <= 1; c++) {

            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }

            if (r == 0 && c == 0) {
              continue;
            }

            if (dark == qrCode.isDark(row + r, col + c) ) {
              sameCount++;
            }
          }
        }

        if (sameCount > 5) {
          lostPoint += (3 + sameCount - 5);
        }
      }
    }

    // LEVEL2

    for (var row = 0; row < moduleCount - 1; row++) {
      for (var col = 0; col < moduleCount - 1; col++) {
        var count = 0;
        if (qrCode.isDark(row,     col    ) ) count++;
        if (qrCode.isDark(row + 1, col    ) ) count++;
        if (qrCode.isDark(row,     col + 1) ) count++;
        if (qrCode.isDark(row + 1, col + 1) ) count++;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }

    // LEVEL3

    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount - 6; col++) {
        if (qrCode.isDark(row, col)
            && !qrCode.isDark(row, col + 1)
            &&  qrCode.isDark(row, col + 2)
            &&  qrCode.isDark(row, col + 3)
            &&  qrCode.isDark(row, col + 4)
            && !qrCode.isDark(row, col + 5)
            &&  qrCode.isDark(row, col + 6) ) {
          lostPoint += 40;
        }
      }
    }

    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount - 6; row++) {
        if (qrCode.isDark(row, col)
            && !qrCode.isDark(row + 1, col)
            &&  qrCode.isDark(row + 2, col)
            &&  qrCode.isDark(row + 3, col)
            &&  qrCode.isDark(row + 4, col)
            && !qrCode.isDark(row + 5, col)
            &&  qrCode.isDark(row + 6, col) ) {
          lostPoint += 40;
        }
      }
    }

    // LEVEL4
    
    var darkCount = 0;

    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col) ) {
          darkCount++;
        }
      }
    }
    
    var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;   
  }
};