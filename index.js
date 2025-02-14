(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory); 
  } else if (typeof exports === "object") {
    module.exports = factory(); 
  } else {
    root.FNV = factory(); 
  }
})(this, function () {
  "use strict";

  class FNV {
    static PRIME = [0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3b];
    static BASE64_LOOKUP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    static BASE64_SAFE_LOOKUP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    static BASE36_LOOKUP = "0123456789abcdefghijklmnopqrstuvwxyz";

    constructor() {
      this._value = [
        0x6c, 0x62, 0x27, 0x2e, 0x07, 0xbb, 0x01, 0x42, 0x62, 0xb8, 0x21, 0x75, 0x62, 0x95, 0xc5, 0x8d,
      ];
      this._scratch = new Array(16);
    }

    static hash(string, encoding = "hex") {
      return new FNV().update(string).digest(encoding);
    }

    update(input) {
      if (typeof input === "string") {
        input = this._stringToBytes(input);
      }

      for (let i = 0; i < input.length; i++) {
        this._value[15] ^= input[i];
        this._primeMultiply();
      }

      return this;
    }

    digest(encoding) {
      switch (encoding) {
        case "base64Url":
          return this._toBase64(true);
        case "base64":
          return this._toBase64();
        case "base36":
          return this._toBase36();
        case "hex":
          return this._value.map((byte) => byte.toString(16).padStart(2, "0")).join("");
        default:
          return [...this._value];
      }
    }

    _stringToBytes(str) {
      let out = [];
      for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 128) {
          out.push(c);
        } else if (c < 2048) {
          out.push((c >> 6) | 192, (c & 63) | 128);
        } else {
          out.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
        }
      }
      return out;
    }

    _primeMultiply() {
      let newValue = new Array(16).fill(0);

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16 - x; y++) {
          let product = this._value[15 - x] * FNV.PRIME[15 - y] + (newValue[15 - (x + y)] || 0);
          if (product > 255) {
            if (x + y + 1 < 16) newValue[15 - (x + y + 1)] += product >>> 8;
            product &= 0xff;
          }
          newValue[15 - (x + y)] = product;
        }
      }

      this._value = newValue;
    }

    _toBase36() {
      let value = [...this._value];
      let result = "";

      while (!value.every((b) => b === 0)) {
        result = FNV.BASE36_LOOKUP[this._longDivide(value, 36)] + result;
      }

      return result;
    }

    _toBase64(safe = false) {
      let lookup = safe ? FNV.BASE64_SAFE_LOOKUP : FNV.BASE64_LOOKUP;
      let result = "";

      for (let i = 0; i < 15; i += 3) {
        let unit = (this._value[i] << 16) + (this._value[i + 1] << 8) + this._value[i + 2];
        result += lookup[(unit >> 18) & 0x3f] + lookup[(unit >> 12) & 0x3f] + lookup[(unit >> 6) & 0x3f] + lookup[unit & 0x3f];
      }

      let lastUnit = this._value[15] << 16;
      return result + lookup[(lastUnit >> 18) & 0x3f] + lookup[(lastUnit >> 12) & 0x3f] + (safe ? "" : "==");
    }

    _longDivide(value, divisor) {
      let remainder = 0;

      for (let i = 0; i < value.length; i++) {
        let operand = (remainder << 8) + value[i];
        value[i] = Math.floor(operand / divisor);
        remainder = operand % divisor;
      }

      return remainder;
    }
  }

  return FNV;
});
