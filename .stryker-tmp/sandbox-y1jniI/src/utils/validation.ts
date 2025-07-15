/**
 * Validation utilities for enhanced security and data integrity
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { createHash } from "crypto";
import { homedir } from "os";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { VALIDATION, FILE_EXTENSIONS } from "./constants.js";
import { ValidationError } from "./errors.js";

/**
 * Path validation to prevent path traversal attacks
 */
export class PathValidator {
  /**
   * Validate file path for security
   */
  static validatePath(path: string): void {
    if (stryMutAct_9fa48("0")) {
      {}
    } else {
      stryCov_9fa48("0");
      if (stryMutAct_9fa48("3") ? false : stryMutAct_9fa48("2") ? true : stryMutAct_9fa48("1") ? path : (stryCov_9fa48("1", "2", "3"), !path)) {
        if (stryMutAct_9fa48("4")) {
          {}
        } else {
          stryCov_9fa48("4");
          throw new ValidationError(stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), "Path cannot be empty"));
        }
      }
      if (stryMutAct_9fa48("9") ? path.length <= VALIDATION.MAX_PATH_LENGTH : stryMutAct_9fa48("8") ? path.length >= VALIDATION.MAX_PATH_LENGTH : stryMutAct_9fa48("7") ? false : stryMutAct_9fa48("6") ? true : (stryCov_9fa48("6", "7", "8", "9"), path.length > VALIDATION.MAX_PATH_LENGTH)) {
        if (stryMutAct_9fa48("10")) {
          {}
        } else {
          stryCov_9fa48("10");
          throw new ValidationError(stryMutAct_9fa48("11") ? `` : (stryCov_9fa48("11"), `Path too long (max ${VALIDATION.MAX_PATH_LENGTH} characters)`));
        }
      }

      // Check for path traversal attempts
      if (stryMutAct_9fa48("14") ? path.includes("..") && path.includes("~") : stryMutAct_9fa48("13") ? false : stryMutAct_9fa48("12") ? true : (stryCov_9fa48("12", "13", "14"), path.includes(stryMutAct_9fa48("15") ? "" : (stryCov_9fa48("15"), "..")) || path.includes(stryMutAct_9fa48("16") ? "" : (stryCov_9fa48("16"), "~")))) {
        if (stryMutAct_9fa48("17")) {
          {}
        } else {
          stryCov_9fa48("17");
          throw new ValidationError(stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), "Path traversal detected"));
        }
      }

      // Check for suspicious characters
      if (stryMutAct_9fa48("21") ? false : stryMutAct_9fa48("20") ? true : stryMutAct_9fa48("19") ? VALIDATION.ALLOWED_PATH_CHARS.test(path) : (stryCov_9fa48("19", "20", "21"), !VALIDATION.ALLOWED_PATH_CHARS.test(path))) {
        if (stryMutAct_9fa48("22")) {
          {}
        } else {
          stryCov_9fa48("22");
          throw new ValidationError(stryMutAct_9fa48("23") ? "" : (stryCov_9fa48("23"), "Path contains invalid characters"));
        }
      }

      // Check for absolute paths outside allowed directories
      if (stryMutAct_9fa48("26") ? path.startsWith("/") || !PathValidator.isAllowedAbsolutePath(path) : stryMutAct_9fa48("25") ? false : stryMutAct_9fa48("24") ? true : (stryCov_9fa48("24", "25", "26"), (stryMutAct_9fa48("27") ? path.endsWith("/") : (stryCov_9fa48("27"), path.startsWith(stryMutAct_9fa48("28") ? "" : (stryCov_9fa48("28"), "/")))) && (stryMutAct_9fa48("29") ? PathValidator.isAllowedAbsolutePath(path) : (stryCov_9fa48("29"), !PathValidator.isAllowedAbsolutePath(path))))) {
        if (stryMutAct_9fa48("30")) {
          {}
        } else {
          stryCov_9fa48("30");
          throw new ValidationError(stryMutAct_9fa48("31") ? "" : (stryCov_9fa48("31"), "Absolute path not allowed"));
        }
      }
    }
  }

  /**
   * Check if absolute path is in allowed directories
   */
  private static isAllowedAbsolutePath(path: string): boolean {
    if (stryMutAct_9fa48("32")) {
      {}
    } else {
      stryCov_9fa48("32");
      const allowedPrefixes = stryMutAct_9fa48("33") ? [] : (stryCov_9fa48("33"), [stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), "/tmp/"), stryMutAct_9fa48("35") ? "" : (stryCov_9fa48("35"), "/var/tmp/"), process.cwd(), homedir() // Allow home directory for cache files
      ]);
      return stryMutAct_9fa48("36") ? allowedPrefixes.every(prefix => path.startsWith(prefix)) : (stryCov_9fa48("36"), allowedPrefixes.some(stryMutAct_9fa48("37") ? () => undefined : (stryCov_9fa48("37"), prefix => stryMutAct_9fa48("38") ? path.endsWith(prefix) : (stryCov_9fa48("38"), path.startsWith(prefix)))));
    }
  }

  /**
   * Sanitize path for safe usage
   */
  static sanitizePath(path: string): string {
    if (stryMutAct_9fa48("39")) {
      {}
    } else {
      stryCov_9fa48("39");
      return stryMutAct_9fa48("40") ? path.replace(/\.\./g, "") // Remove path traversal
      .replace(/[<>:"|?*]/g, "") // Remove invalid filename chars
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .toUpperCase() : (stryCov_9fa48("40"), path.replace(/\.\./g, stryMutAct_9fa48("41") ? "Stryker was here!" : (stryCov_9fa48("41"), "")) // Remove path traversal
      .replace(stryMutAct_9fa48("42") ? /[^<>:"|?*]/g : (stryCov_9fa48("42"), /[<>:"|?*]/g), stryMutAct_9fa48("43") ? "Stryker was here!" : (stryCov_9fa48("43"), "")) // Remove invalid filename chars
      .replace(stryMutAct_9fa48("45") ? /\S+/g : stryMutAct_9fa48("44") ? /\s/g : (stryCov_9fa48("44", "45"), /\s+/g), stryMutAct_9fa48("46") ? "" : (stryCov_9fa48("46"), "_")) // Replace spaces with underscores
      .toLowerCase());
    }
  }

  /**
   * Validate file extension
   */
  static validateFileExtension(path: string, allowedExtensions: readonly string[]): void {
    if (stryMutAct_9fa48("47")) {
      {}
    } else {
      stryCov_9fa48("47");
      const extension = stryMutAct_9fa48("49") ? path.toUpperCase().substring(path.lastIndexOf(".")) : stryMutAct_9fa48("48") ? path.toLowerCase() : (stryCov_9fa48("48", "49"), path.toLowerCase().substring(path.lastIndexOf(stryMutAct_9fa48("50") ? "" : (stryCov_9fa48("50"), "."))));
      if (stryMutAct_9fa48("53") ? false : stryMutAct_9fa48("52") ? true : stryMutAct_9fa48("51") ? allowedExtensions.includes(extension) : (stryCov_9fa48("51", "52", "53"), !allowedExtensions.includes(extension))) {
        if (stryMutAct_9fa48("54")) {
          {}
        } else {
          stryCov_9fa48("54");
          throw new ValidationError(stryMutAct_9fa48("55") ? `` : (stryCov_9fa48("55"), `Invalid file extension. Allowed: ${allowedExtensions.join(stryMutAct_9fa48("56") ? "" : (stryCov_9fa48("56"), ", "))}`));
        }
      }
    }
  }
}

/**
 * File validation utilities
 */
export class FileValidator {
  /**
   * Validate file size
   */
  static validateFileSize(sizeBytes: number, maxSizeMB: number = VALIDATION.MAX_FILE_SIZE_MB): void {
    if (stryMutAct_9fa48("57")) {
      {}
    } else {
      stryCov_9fa48("57");
      const maxSizeBytes = stryMutAct_9fa48("58") ? maxSizeMB * 1024 / 1024 : (stryCov_9fa48("58"), (stryMutAct_9fa48("59") ? maxSizeMB / 1024 : (stryCov_9fa48("59"), maxSizeMB * 1024)) * 1024);
      if (stryMutAct_9fa48("63") ? sizeBytes <= maxSizeBytes : stryMutAct_9fa48("62") ? sizeBytes >= maxSizeBytes : stryMutAct_9fa48("61") ? false : stryMutAct_9fa48("60") ? true : (stryCov_9fa48("60", "61", "62", "63"), sizeBytes > maxSizeBytes)) {
        if (stryMutAct_9fa48("64")) {
          {}
        } else {
          stryCov_9fa48("64");
          throw new ValidationError(stryMutAct_9fa48("65") ? `` : (stryCov_9fa48("65"), `File too large (${Math.round(stryMutAct_9fa48("66") ? sizeBytes / 1024 * 1024 : (stryCov_9fa48("66"), (stryMutAct_9fa48("67") ? sizeBytes * 1024 : (stryCov_9fa48("67"), sizeBytes / 1024)) / 1024))}MB). Maximum allowed: ${maxSizeMB}MB`));
        }
      }
      if (stryMutAct_9fa48("71") ? sizeBytes >= VALIDATION.MIN_SPEC_SIZE_BYTES : stryMutAct_9fa48("70") ? sizeBytes <= VALIDATION.MIN_SPEC_SIZE_BYTES : stryMutAct_9fa48("69") ? false : stryMutAct_9fa48("68") ? true : (stryCov_9fa48("68", "69", "70", "71"), sizeBytes < VALIDATION.MIN_SPEC_SIZE_BYTES)) {
        if (stryMutAct_9fa48("72")) {
          {}
        } else {
          stryCov_9fa48("72");
          throw new ValidationError(stryMutAct_9fa48("73") ? `` : (stryCov_9fa48("73"), `File too small (${sizeBytes} bytes). Minimum required: ${VALIDATION.MIN_SPEC_SIZE_BYTES} bytes`));
        }
      }
    }
  }

  /**
   * Validate OpenAPI spec file
   */
  static validateOpenAPIFile(path: string, sizeBytes: number): void {
    if (stryMutAct_9fa48("74")) {
      {}
    } else {
      stryCov_9fa48("74");
      PathValidator.validatePath(path);
      PathValidator.validateFileExtension(path, FILE_EXTENSIONS.OPENAPI);
      FileValidator.validateFileSize(sizeBytes, VALIDATION.MAX_SPEC_SIZE_MB);
    }
  }

  /**
   * Validate file content structure
   */
  static validateOpenAPIContent(content: string | any): void {
    if (stryMutAct_9fa48("75")) {
      {}
    } else {
      stryCov_9fa48("75");
      let parsedContent: any;

      // Parse content if it's a string
      if (stryMutAct_9fa48("78") ? typeof content !== "string" : stryMutAct_9fa48("77") ? false : stryMutAct_9fa48("76") ? true : (stryCov_9fa48("76", "77", "78"), typeof content === (stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), "string")))) {
        if (stryMutAct_9fa48("80")) {
          {}
        } else {
          stryCov_9fa48("80");
          try {
            if (stryMutAct_9fa48("81")) {
              {}
            } else {
              stryCov_9fa48("81");
              parsedContent = JSON.parse(content);
            }
          } catch (error) {
            if (stryMutAct_9fa48("82")) {
              {}
            } else {
              stryCov_9fa48("82");
              throw new ValidationError(stryMutAct_9fa48("83") ? "" : (stryCov_9fa48("83"), "Invalid JSON content"));
            }
          }
        }
      } else {
        if (stryMutAct_9fa48("84")) {
          {}
        } else {
          stryCov_9fa48("84");
          parsedContent = content;
        }
      }
      if (stryMutAct_9fa48("87") ? !parsedContent && typeof parsedContent !== "object" : stryMutAct_9fa48("86") ? false : stryMutAct_9fa48("85") ? true : (stryCov_9fa48("85", "86", "87"), (stryMutAct_9fa48("88") ? parsedContent : (stryCov_9fa48("88"), !parsedContent)) || (stryMutAct_9fa48("90") ? typeof parsedContent === "object" : stryMutAct_9fa48("89") ? false : (stryCov_9fa48("89", "90"), typeof parsedContent !== (stryMutAct_9fa48("91") ? "" : (stryCov_9fa48("91"), "object")))))) {
        if (stryMutAct_9fa48("92")) {
          {}
        } else {
          stryCov_9fa48("92");
          throw new ValidationError(stryMutAct_9fa48("93") ? "" : (stryCov_9fa48("93"), "Invalid OpenAPI content: must be an object"));
        }
      }

      // Check for required OpenAPI fields
      if (stryMutAct_9fa48("96") ? !parsedContent.openapi || !parsedContent.swagger : stryMutAct_9fa48("95") ? false : stryMutAct_9fa48("94") ? true : (stryCov_9fa48("94", "95", "96"), (stryMutAct_9fa48("97") ? parsedContent.openapi : (stryCov_9fa48("97"), !parsedContent.openapi)) && (stryMutAct_9fa48("98") ? parsedContent.swagger : (stryCov_9fa48("98"), !parsedContent.swagger)))) {
        if (stryMutAct_9fa48("99")) {
          {}
        } else {
          stryCov_9fa48("99");
          throw new ValidationError(stryMutAct_9fa48("100") ? "" : (stryCov_9fa48("100"), "Invalid OpenAPI content: missing version field"));
        }
      }
      if (stryMutAct_9fa48("103") ? false : stryMutAct_9fa48("102") ? true : stryMutAct_9fa48("101") ? parsedContent.info : (stryCov_9fa48("101", "102", "103"), !parsedContent.info)) {
        if (stryMutAct_9fa48("104")) {
          {}
        } else {
          stryCov_9fa48("104");
          throw new ValidationError(stryMutAct_9fa48("105") ? "" : (stryCov_9fa48("105"), "Invalid OpenAPI content: missing info field"));
        }
      }
      if (stryMutAct_9fa48("108") ? false : stryMutAct_9fa48("107") ? true : stryMutAct_9fa48("106") ? parsedContent.info.title : (stryCov_9fa48("106", "107", "108"), !parsedContent.info.title)) {
        if (stryMutAct_9fa48("109")) {
          {}
        } else {
          stryCov_9fa48("109");
          throw new ValidationError(stryMutAct_9fa48("110") ? "" : (stryCov_9fa48("110"), "Invalid OpenAPI content: missing title in info"));
        }
      }

      // Basic structure validation
      if (stryMutAct_9fa48("113") ? parsedContent.paths || typeof parsedContent.paths !== "object" : stryMutAct_9fa48("112") ? false : stryMutAct_9fa48("111") ? true : (stryCov_9fa48("111", "112", "113"), parsedContent.paths && (stryMutAct_9fa48("115") ? typeof parsedContent.paths === "object" : stryMutAct_9fa48("114") ? true : (stryCov_9fa48("114", "115"), typeof parsedContent.paths !== (stryMutAct_9fa48("116") ? "" : (stryCov_9fa48("116"), "object")))))) {
        if (stryMutAct_9fa48("117")) {
          {}
        } else {
          stryCov_9fa48("117");
          throw new ValidationError(stryMutAct_9fa48("118") ? "" : (stryCov_9fa48("118"), "Invalid OpenAPI content: paths must be an object"));
        }
      }
      if (stryMutAct_9fa48("121") ? parsedContent.components || typeof parsedContent.components !== "object" : stryMutAct_9fa48("120") ? false : stryMutAct_9fa48("119") ? true : (stryCov_9fa48("119", "120", "121"), parsedContent.components && (stryMutAct_9fa48("123") ? typeof parsedContent.components === "object" : stryMutAct_9fa48("122") ? true : (stryCov_9fa48("122", "123"), typeof parsedContent.components !== (stryMutAct_9fa48("124") ? "" : (stryCov_9fa48("124"), "object")))))) {
        if (stryMutAct_9fa48("125")) {
          {}
        } else {
          stryCov_9fa48("125");
          throw new ValidationError(stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), "Invalid OpenAPI content: components must be an object"));
        }
      }
    }
  }
}

/**
 * Cache validation utilities
 */
export class CacheValidator {
  /**
   * Validate cache entry integrity
   */
  static validateCacheEntry(_key: string, data: any): boolean {
    if (stryMutAct_9fa48("127")) {
      {}
    } else {
      stryCov_9fa48("127");
      try {
        if (stryMutAct_9fa48("128")) {
          {}
        } else {
          stryCov_9fa48("128");
          // Basic structure validation
          if (stryMutAct_9fa48("131") ? !data && typeof data !== "object" : stryMutAct_9fa48("130") ? false : stryMutAct_9fa48("129") ? true : (stryCov_9fa48("129", "130", "131"), (stryMutAct_9fa48("132") ? data : (stryCov_9fa48("132"), !data)) || (stryMutAct_9fa48("134") ? typeof data === "object" : stryMutAct_9fa48("133") ? false : (stryCov_9fa48("133", "134"), typeof data !== (stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), "object")))))) {
            if (stryMutAct_9fa48("136")) {
              {}
            } else {
              stryCov_9fa48("136");
              return stryMutAct_9fa48("137") ? true : (stryCov_9fa48("137"), false);
            }
          }

          // Check for required metadata
          if (stryMutAct_9fa48("140") ? !data.timestamp && !data.value : stryMutAct_9fa48("139") ? false : stryMutAct_9fa48("138") ? true : (stryCov_9fa48("138", "139", "140"), (stryMutAct_9fa48("141") ? data.timestamp : (stryCov_9fa48("141"), !data.timestamp)) || (stryMutAct_9fa48("142") ? data.value : (stryCov_9fa48("142"), !data.value)))) {
            if (stryMutAct_9fa48("143")) {
              {}
            } else {
              stryCov_9fa48("143");
              return stryMutAct_9fa48("144") ? true : (stryCov_9fa48("144"), false);
            }
          }

          // Validate timestamp
          const timestamp = new Date(data.timestamp);
          if (stryMutAct_9fa48("146") ? false : stryMutAct_9fa48("145") ? true : (stryCov_9fa48("145", "146"), isNaN(timestamp.getTime()))) {
            if (stryMutAct_9fa48("147")) {
              {}
            } else {
              stryCov_9fa48("147");
              return stryMutAct_9fa48("148") ? true : (stryCov_9fa48("148"), false);
            }
          }

          // Check if data is too old (beyond any reasonable TTL)
          const maxAge = stryMutAct_9fa48("149") ? 7 * 24 * 60 * 60 / 1000 : (stryCov_9fa48("149"), (stryMutAct_9fa48("150") ? 7 * 24 * 60 / 60 : (stryCov_9fa48("150"), (stryMutAct_9fa48("151") ? 7 * 24 / 60 : (stryCov_9fa48("151"), (stryMutAct_9fa48("152") ? 7 / 24 : (stryCov_9fa48("152"), 7 * 24)) * 60)) * 60)) * 1000); // 7 days
          if (stryMutAct_9fa48("156") ? Date.now() - timestamp.getTime() <= maxAge : stryMutAct_9fa48("155") ? Date.now() - timestamp.getTime() >= maxAge : stryMutAct_9fa48("154") ? false : stryMutAct_9fa48("153") ? true : (stryCov_9fa48("153", "154", "155", "156"), (stryMutAct_9fa48("157") ? Date.now() + timestamp.getTime() : (stryCov_9fa48("157"), Date.now() - timestamp.getTime())) > maxAge)) {
            if (stryMutAct_9fa48("158")) {
              {}
            } else {
              stryCov_9fa48("158");
              return stryMutAct_9fa48("159") ? true : (stryCov_9fa48("159"), false);
            }
          }
          return stryMutAct_9fa48("160") ? false : (stryCov_9fa48("160"), true);
        }
      } catch (error) {
        if (stryMutAct_9fa48("161")) {
          {}
        } else {
          stryCov_9fa48("161");
          return stryMutAct_9fa48("162") ? true : (stryCov_9fa48("162"), false);
        }
      }
    }
  }

  /**
   * Generate cache integrity hash
   */
  static generateIntegrityHash(data: any): string {
    if (stryMutAct_9fa48("163")) {
      {}
    } else {
      stryCov_9fa48("163");
      const serialized = JSON.stringify(data, stryMutAct_9fa48("164") ? Object.keys(data) : (stryCov_9fa48("164"), Object.keys(data).sort()));
      return createHash(stryMutAct_9fa48("165") ? "" : (stryCov_9fa48("165"), "sha256")).update(serialized).digest(stryMutAct_9fa48("166") ? "" : (stryCov_9fa48("166"), "hex"));
    }
  }

  /**
   * Verify cache integrity
   */
  static verifyCacheIntegrity(data: any, expectedHash: string): boolean {
    if (stryMutAct_9fa48("167")) {
      {}
    } else {
      stryCov_9fa48("167");
      try {
        if (stryMutAct_9fa48("168")) {
          {}
        } else {
          stryCov_9fa48("168");
          const actualHash = CacheValidator.generateIntegrityHash(data);
          return stryMutAct_9fa48("171") ? actualHash !== expectedHash : stryMutAct_9fa48("170") ? false : stryMutAct_9fa48("169") ? true : (stryCov_9fa48("169", "170", "171"), actualHash === expectedHash);
        }
      } catch (error) {
        if (stryMutAct_9fa48("172")) {
          {}
        } else {
          stryCov_9fa48("172");
          return stryMutAct_9fa48("173") ? true : (stryCov_9fa48("173"), false);
        }
      }
    }
  }
}

/**
 * API data validation utilities
 */
export class APIDataValidator {
  /**
   * Validate provider name
   */
  static validateProviderName(provider: string): void {
    if (stryMutAct_9fa48("174")) {
      {}
    } else {
      stryCov_9fa48("174");
      if (stryMutAct_9fa48("177") ? !provider && typeof provider !== "string" : stryMutAct_9fa48("176") ? false : stryMutAct_9fa48("175") ? true : (stryCov_9fa48("175", "176", "177"), (stryMutAct_9fa48("178") ? provider : (stryCov_9fa48("178"), !provider)) || (stryMutAct_9fa48("180") ? typeof provider === "string" : stryMutAct_9fa48("179") ? false : (stryCov_9fa48("179", "180"), typeof provider !== (stryMutAct_9fa48("181") ? "" : (stryCov_9fa48("181"), "string")))))) {
        if (stryMutAct_9fa48("182")) {
          {}
        } else {
          stryCov_9fa48("182");
          throw new ValidationError(stryMutAct_9fa48("183") ? "" : (stryCov_9fa48("183"), "Provider name must be a non-empty string"));
        }
      }
      if (stryMutAct_9fa48("187") ? provider.length <= 255 : stryMutAct_9fa48("186") ? provider.length >= 255 : stryMutAct_9fa48("185") ? false : stryMutAct_9fa48("184") ? true : (stryCov_9fa48("184", "185", "186", "187"), provider.length > 255)) {
        if (stryMutAct_9fa48("188")) {
          {}
        } else {
          stryCov_9fa48("188");
          throw new ValidationError(stryMutAct_9fa48("189") ? "" : (stryCov_9fa48("189"), "Provider name too long (max 255 characters)"));
        }
      }

      // Basic domain name validation
      const domainRegex = stryMutAct_9fa48("202") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[^a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("201") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([^a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("200") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-][a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("199") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$/ : stryMutAct_9fa48("198") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[^a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("197") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/ : stryMutAct_9fa48("196") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[^a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("195") ? /^[a-zA-Z0-9]([^a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("194") ? /^[a-zA-Z0-9]([a-zA-Z0-9-][a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("193") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("192") ? /^[^a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : stryMutAct_9fa48("191") ? /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/ : stryMutAct_9fa48("190") ? /[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/ : (stryCov_9fa48("190", "191", "192", "193", "194", "195", "196", "197", "198", "199", "200", "201", "202"), /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);
      if (stryMutAct_9fa48("205") ? false : stryMutAct_9fa48("204") ? true : stryMutAct_9fa48("203") ? domainRegex.test(provider) : (stryCov_9fa48("203", "204", "205"), !domainRegex.test(provider))) {
        if (stryMutAct_9fa48("206")) {
          {}
        } else {
          stryCov_9fa48("206");
          throw new ValidationError(stryMutAct_9fa48("207") ? "" : (stryCov_9fa48("207"), "Invalid provider name format"));
        }
      }
    }
  }

  /**
   * Validate API identifier
   */
  static validateAPIId(apiId: string): void {
    if (stryMutAct_9fa48("208")) {
      {}
    } else {
      stryCov_9fa48("208");
      if (stryMutAct_9fa48("211") ? !apiId && typeof apiId !== "string" : stryMutAct_9fa48("210") ? false : stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209", "210", "211"), (stryMutAct_9fa48("212") ? apiId : (stryCov_9fa48("212"), !apiId)) || (stryMutAct_9fa48("214") ? typeof apiId === "string" : stryMutAct_9fa48("213") ? false : (stryCov_9fa48("213", "214"), typeof apiId !== (stryMutAct_9fa48("215") ? "" : (stryCov_9fa48("215"), "string")))))) {
        if (stryMutAct_9fa48("216")) {
          {}
        } else {
          stryCov_9fa48("216");
          throw new ValidationError(stryMutAct_9fa48("217") ? "" : (stryCov_9fa48("217"), "API ID must be a non-empty string"));
        }
      }
      if (stryMutAct_9fa48("221") ? apiId.length <= 500 : stryMutAct_9fa48("220") ? apiId.length >= 500 : stryMutAct_9fa48("219") ? false : stryMutAct_9fa48("218") ? true : (stryCov_9fa48("218", "219", "220", "221"), apiId.length > 500)) {
        if (stryMutAct_9fa48("222")) {
          {}
        } else {
          stryCov_9fa48("222");
          throw new ValidationError(stryMutAct_9fa48("223") ? "" : (stryCov_9fa48("223"), "API ID too long (max 500 characters)"));
        }
      }

      // Check for valid format (provider:service:version or provider:service)
      const parts = apiId.split(stryMutAct_9fa48("224") ? "" : (stryCov_9fa48("224"), ":"));
      if (stryMutAct_9fa48("227") ? parts.length < 2 && parts.length > 3 : stryMutAct_9fa48("226") ? false : stryMutAct_9fa48("225") ? true : (stryCov_9fa48("225", "226", "227"), (stryMutAct_9fa48("230") ? parts.length >= 2 : stryMutAct_9fa48("229") ? parts.length <= 2 : stryMutAct_9fa48("228") ? false : (stryCov_9fa48("228", "229", "230"), parts.length < 2)) || (stryMutAct_9fa48("233") ? parts.length <= 3 : stryMutAct_9fa48("232") ? parts.length >= 3 : stryMutAct_9fa48("231") ? false : (stryCov_9fa48("231", "232", "233"), parts.length > 3)))) {
        if (stryMutAct_9fa48("234")) {
          {}
        } else {
          stryCov_9fa48("234");
          throw new ValidationError(stryMutAct_9fa48("235") ? "" : (stryCov_9fa48("235"), "Invalid API ID format (expected provider:service or provider:service:version)"));
        }
      }
      parts.forEach((part, index) => {
        if (stryMutAct_9fa48("236")) {
          {}
        } else {
          stryCov_9fa48("236");
          if (stryMutAct_9fa48("239") ? false : stryMutAct_9fa48("238") ? true : stryMutAct_9fa48("237") ? part.trim() : (stryCov_9fa48("237", "238", "239"), !(stryMutAct_9fa48("240") ? part : (stryCov_9fa48("240"), part.trim())))) {
            if (stryMutAct_9fa48("241")) {
              {}
            } else {
              stryCov_9fa48("241");
              throw new ValidationError(stryMutAct_9fa48("242") ? `` : (stryCov_9fa48("242"), `API ID part ${stryMutAct_9fa48("243") ? index - 1 : (stryCov_9fa48("243"), index + 1)} cannot be empty`));
            }
          }
        }
      });
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, limit?: number): {
    page: number;
    limit: number;
  } {
    if (stryMutAct_9fa48("244")) {
      {}
    } else {
      stryCov_9fa48("244");
      const validatedPage = stryMutAct_9fa48("245") ? Math.min(1, Math.floor(page || 1)) : (stryCov_9fa48("245"), Math.max(1, Math.floor(stryMutAct_9fa48("248") ? page && 1 : stryMutAct_9fa48("247") ? false : stryMutAct_9fa48("246") ? true : (stryCov_9fa48("246", "247", "248"), page || 1))));
      const validatedLimit = stryMutAct_9fa48("249") ? Math.min(VALIDATION.MIN_SPEC_SIZE_BYTES, Math.min(100, Math.floor(limit || 20))) : (stryCov_9fa48("249"), Math.max(VALIDATION.MIN_SPEC_SIZE_BYTES, stryMutAct_9fa48("250") ? Math.max(100, Math.floor(limit || 20)) : (stryCov_9fa48("250"), Math.min(100, Math.floor(stryMutAct_9fa48("253") ? limit && 20 : stryMutAct_9fa48("252") ? false : stryMutAct_9fa48("251") ? true : (stryCov_9fa48("251", "252", "253"), limit || 20))))));
      return stryMutAct_9fa48("254") ? {} : (stryCov_9fa48("254"), {
        page: validatedPage,
        limit: validatedLimit
      });
    }
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(query: string): void {
    if (stryMutAct_9fa48("255")) {
      {}
    } else {
      stryCov_9fa48("255");
      if (stryMutAct_9fa48("258") ? !query && typeof query !== "string" : stryMutAct_9fa48("257") ? false : stryMutAct_9fa48("256") ? true : (stryCov_9fa48("256", "257", "258"), (stryMutAct_9fa48("259") ? query : (stryCov_9fa48("259"), !query)) || (stryMutAct_9fa48("261") ? typeof query === "string" : stryMutAct_9fa48("260") ? false : (stryCov_9fa48("260", "261"), typeof query !== (stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), "string")))))) {
        if (stryMutAct_9fa48("263")) {
          {}
        } else {
          stryCov_9fa48("263");
          throw new ValidationError(stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), "Search query must be a non-empty string"));
        }
      }
      if (stryMutAct_9fa48("268") ? query.length >= 2 : stryMutAct_9fa48("267") ? query.length <= 2 : stryMutAct_9fa48("266") ? false : stryMutAct_9fa48("265") ? true : (stryCov_9fa48("265", "266", "267", "268"), query.length < 2)) {
        if (stryMutAct_9fa48("269")) {
          {}
        } else {
          stryCov_9fa48("269");
          throw new ValidationError(stryMutAct_9fa48("270") ? "" : (stryCov_9fa48("270"), "Search query too short (minimum 2 characters)"));
        }
      }
      if (stryMutAct_9fa48("274") ? query.length <= 1000 : stryMutAct_9fa48("273") ? query.length >= 1000 : stryMutAct_9fa48("272") ? false : stryMutAct_9fa48("271") ? true : (stryCov_9fa48("271", "272", "273", "274"), query.length > 1000)) {
        if (stryMutAct_9fa48("275")) {
          {}
        } else {
          stryCov_9fa48("275");
          throw new ValidationError(stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), "Search query too long (maximum 1000 characters)"));
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = stryMutAct_9fa48("277") ? [] : (stryCov_9fa48("277"), [/<script/i, /javascript:/i, /data:/i, /vbscript:/i]);
      if (stryMutAct_9fa48("280") ? suspiciousPatterns.every(pattern => pattern.test(query)) : stryMutAct_9fa48("279") ? false : stryMutAct_9fa48("278") ? true : (stryCov_9fa48("278", "279", "280"), suspiciousPatterns.some(stryMutAct_9fa48("281") ? () => undefined : (stryCov_9fa48("281"), pattern => pattern.test(query))))) {
        if (stryMutAct_9fa48("282")) {
          {}
        } else {
          stryCov_9fa48("282");
          throw new ValidationError(stryMutAct_9fa48("283") ? "" : (stryCov_9fa48("283"), "Search query contains invalid content"));
        }
      }
    }
  }
}

/**
 * URL validation utilities
 */
export class URLValidator {
  /**
   * Validate URL format and security
   */
  static validateURL(url: string): void {
    if (stryMutAct_9fa48("284")) {
      {}
    } else {
      stryCov_9fa48("284");
      if (stryMutAct_9fa48("287") ? !url && typeof url !== "string" : stryMutAct_9fa48("286") ? false : stryMutAct_9fa48("285") ? true : (stryCov_9fa48("285", "286", "287"), (stryMutAct_9fa48("288") ? url : (stryCov_9fa48("288"), !url)) || (stryMutAct_9fa48("290") ? typeof url === "string" : stryMutAct_9fa48("289") ? false : (stryCov_9fa48("289", "290"), typeof url !== (stryMutAct_9fa48("291") ? "" : (stryCov_9fa48("291"), "string")))))) {
        if (stryMutAct_9fa48("292")) {
          {}
        } else {
          stryCov_9fa48("292");
          throw new ValidationError(stryMutAct_9fa48("293") ? "" : (stryCov_9fa48("293"), "URL must be a non-empty string"));
        }
      }
      try {
        if (stryMutAct_9fa48("294")) {
          {}
        } else {
          stryCov_9fa48("294");
          const parsedURL = new URL(url);

          // Only allow HTTP and HTTPS
          if (stryMutAct_9fa48("297") ? false : stryMutAct_9fa48("296") ? true : stryMutAct_9fa48("295") ? ["http:", "https:"].includes(parsedURL.protocol) : (stryCov_9fa48("295", "296", "297"), !(stryMutAct_9fa48("298") ? [] : (stryCov_9fa48("298"), [stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), "http:"), stryMutAct_9fa48("300") ? "" : (stryCov_9fa48("300"), "https:")])).includes(parsedURL.protocol))) {
            if (stryMutAct_9fa48("301")) {
              {}
            } else {
              stryCov_9fa48("301");
              throw new ValidationError(stryMutAct_9fa48("302") ? "" : (stryCov_9fa48("302"), "Only HTTP and HTTPS URLs are allowed"));
            }
          }

          // Block local/private addresses
          if (stryMutAct_9fa48("304") ? false : stryMutAct_9fa48("303") ? true : (stryCov_9fa48("303", "304"), URLValidator.isLocalAddress(parsedURL.hostname))) {
            if (stryMutAct_9fa48("305")) {
              {}
            } else {
              stryCov_9fa48("305");
              throw new ValidationError(stryMutAct_9fa48("306") ? "" : (stryCov_9fa48("306"), "Local and private addresses are not allowed"));
            }
          }
        }
      } catch (error) {
        if (stryMutAct_9fa48("307")) {
          {}
        } else {
          stryCov_9fa48("307");
          if (stryMutAct_9fa48("309") ? false : stryMutAct_9fa48("308") ? true : (stryCov_9fa48("308", "309"), error instanceof ValidationError)) {
            if (stryMutAct_9fa48("310")) {
              {}
            } else {
              stryCov_9fa48("310");
              throw error;
            }
          }
          throw new ValidationError(stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), "Invalid URL format"));
        }
      }
    }
  }

  /**
   * Check if hostname is a local/private address
   */
  private static isLocalAddress(hostname: string): boolean {
    if (stryMutAct_9fa48("312")) {
      {}
    } else {
      stryCov_9fa48("312");
      const localPatterns = stryMutAct_9fa48("313") ? [] : (stryCov_9fa48("313"), [stryMutAct_9fa48("315") ? /^localhost/i : stryMutAct_9fa48("314") ? /localhost$/i : (stryCov_9fa48("314", "315"), /^localhost$/i), stryMutAct_9fa48("316") ? /127\./ : (stryCov_9fa48("316"), /^127\./), stryMutAct_9fa48("317") ? /192\.168\./ : (stryCov_9fa48("317"), /^192\.168\./), stryMutAct_9fa48("318") ? /10\./ : (stryCov_9fa48("318"), /^10\./), stryMutAct_9fa48("322") ? /^172\.(1[6-9]|2[0-9]|3[^0-1])\./ : stryMutAct_9fa48("321") ? /^172\.(1[6-9]|2[^0-9]|3[0-1])\./ : stryMutAct_9fa48("320") ? /^172\.(1[^6-9]|2[0-9]|3[0-1])\./ : stryMutAct_9fa48("319") ? /172\.(1[6-9]|2[0-9]|3[0-1])\./ : (stryCov_9fa48("319", "320", "321", "322"), /^172\.(1[6-9]|2[0-9]|3[0-1])\./), stryMutAct_9fa48("323") ? /169\.254\./ : (stryCov_9fa48("323"), /^169\.254\./), stryMutAct_9fa48("325") ? /^::1/ : stryMutAct_9fa48("324") ? /::1$/ : (stryCov_9fa48("324", "325"), /^::1$/), stryMutAct_9fa48("326") ? /fe80:/i : (stryCov_9fa48("326"), /^fe80:/i)]);
      return stryMutAct_9fa48("327") ? localPatterns.every(pattern => pattern.test(hostname)) : (stryCov_9fa48("327"), localPatterns.some(stryMutAct_9fa48("328") ? () => undefined : (stryCov_9fa48("328"), pattern => pattern.test(hostname))));
    }
  }
}

/**
 * Data validation and sanitization utilities
 * Ensures all API responses are properly validated before use
 */

export interface ValidationResult<T> {
  isValid: boolean;
  data: T;
  errors: string[];
  warnings: string[];
}

/**
 * Validation utilities for API responses
 */
export class DataValidator {
  /**
   * Validate and sanitize provider list
   */
  static validateProviders(providers: any): ValidationResult<{
    data: string[];
  }> {
    if (stryMutAct_9fa48("329")) {
      {}
    } else {
      stryCov_9fa48("329");
      const errors: string[] = stryMutAct_9fa48("330") ? ["Stryker was here"] : (stryCov_9fa48("330"), []);
      const warnings: string[] = stryMutAct_9fa48("331") ? ["Stryker was here"] : (stryCov_9fa48("331"), []);
      const sanitizedData: string[] = stryMutAct_9fa48("332") ? ["Stryker was here"] : (stryCov_9fa48("332"), []);

      // Check if providers is an object with data property
      if (stryMutAct_9fa48("335") ? !providers && typeof providers !== "object" : stryMutAct_9fa48("334") ? false : stryMutAct_9fa48("333") ? true : (stryCov_9fa48("333", "334", "335"), (stryMutAct_9fa48("336") ? providers : (stryCov_9fa48("336"), !providers)) || (stryMutAct_9fa48("338") ? typeof providers === "object" : stryMutAct_9fa48("337") ? false : (stryCov_9fa48("337", "338"), typeof providers !== (stryMutAct_9fa48("339") ? "" : (stryCov_9fa48("339"), "object")))))) {
        if (stryMutAct_9fa48("340")) {
          {}
        } else {
          stryCov_9fa48("340");
          errors.push(stryMutAct_9fa48("341") ? "" : (stryCov_9fa48("341"), "Providers response must be an object"));
          return stryMutAct_9fa48("342") ? {} : (stryCov_9fa48("342"), {
            isValid: stryMutAct_9fa48("343") ? true : (stryCov_9fa48("343"), false),
            data: stryMutAct_9fa48("344") ? {} : (stryCov_9fa48("344"), {
              data: stryMutAct_9fa48("345") ? ["Stryker was here"] : (stryCov_9fa48("345"), [])
            }),
            errors,
            warnings
          });
        }
      }

      // Check if data property exists and is an array
      if (stryMutAct_9fa48("348") ? false : stryMutAct_9fa48("347") ? true : stryMutAct_9fa48("346") ? Array.isArray(providers.data) : (stryCov_9fa48("346", "347", "348"), !Array.isArray(providers.data))) {
        if (stryMutAct_9fa48("349")) {
          {}
        } else {
          stryCov_9fa48("349");
          errors.push(stryMutAct_9fa48("350") ? "" : (stryCov_9fa48("350"), "Providers data must be an array"));
          return stryMutAct_9fa48("351") ? {} : (stryCov_9fa48("351"), {
            isValid: stryMutAct_9fa48("352") ? true : (stryCov_9fa48("352"), false),
            data: stryMutAct_9fa48("353") ? {} : (stryCov_9fa48("353"), {
              data: stryMutAct_9fa48("354") ? ["Stryker was here"] : (stryCov_9fa48("354"), [])
            }),
            errors,
            warnings
          });
        }
      }

      // Validate and sanitize each provider entry
      for (let i = 0; stryMutAct_9fa48("357") ? i >= providers.data.length : stryMutAct_9fa48("356") ? i <= providers.data.length : stryMutAct_9fa48("355") ? false : (stryCov_9fa48("355", "356", "357"), i < providers.data.length); stryMutAct_9fa48("358") ? i-- : (stryCov_9fa48("358"), i++)) {
        if (stryMutAct_9fa48("359")) {
          {}
        } else {
          stryCov_9fa48("359");
          const provider = providers.data[i];

          // Skip null, undefined, or empty values
          if (stryMutAct_9fa48("362") ? provider == null && provider === "" : stryMutAct_9fa48("361") ? false : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361", "362"), (stryMutAct_9fa48("364") ? provider != null : stryMutAct_9fa48("363") ? false : (stryCov_9fa48("363", "364"), provider == null)) || (stryMutAct_9fa48("366") ? provider !== "" : stryMutAct_9fa48("365") ? false : (stryCov_9fa48("365", "366"), provider === (stryMutAct_9fa48("367") ? "Stryker was here!" : (stryCov_9fa48("367"), "")))))) {
            if (stryMutAct_9fa48("368")) {
              {}
            } else {
              stryCov_9fa48("368");
              warnings.push(stryMutAct_9fa48("369") ? `` : (stryCov_9fa48("369"), `Skipped null/empty provider at index ${i}`));
              continue;
            }
          }

          // Convert to string if not already
          if (stryMutAct_9fa48("372") ? typeof provider === "string" : stryMutAct_9fa48("371") ? false : stryMutAct_9fa48("370") ? true : (stryCov_9fa48("370", "371", "372"), typeof provider !== (stryMutAct_9fa48("373") ? "" : (stryCov_9fa48("373"), "string")))) {
            if (stryMutAct_9fa48("374")) {
              {}
            } else {
              stryCov_9fa48("374");
              warnings.push(stryMutAct_9fa48("375") ? `` : (stryCov_9fa48("375"), `Converted non-string provider at index ${i}: ${typeof provider}`));
              const stringified = String(provider);
              if (stryMutAct_9fa48("378") ? stringified !== "[object Object]" : stryMutAct_9fa48("377") ? false : stryMutAct_9fa48("376") ? true : (stryCov_9fa48("376", "377", "378"), stringified === (stryMutAct_9fa48("379") ? "" : (stryCov_9fa48("379"), "[object Object]")))) {
                if (stryMutAct_9fa48("380")) {
                  {}
                } else {
                  stryCov_9fa48("380");
                  warnings.push(stryMutAct_9fa48("381") ? `` : (stryCov_9fa48("381"), `Skipped unparseable object at index ${i}`));
                  continue;
                }
              }
              sanitizedData.push(stringified);
              continue;
            }
          }

          // Validate string is not empty after trim
          const trimmed = stryMutAct_9fa48("382") ? provider : (stryCov_9fa48("382"), provider.trim());
          if (stryMutAct_9fa48("385") ? trimmed.length !== 0 : stryMutAct_9fa48("384") ? false : stryMutAct_9fa48("383") ? true : (stryCov_9fa48("383", "384", "385"), trimmed.length === 0)) {
            if (stryMutAct_9fa48("386")) {
              {}
            } else {
              stryCov_9fa48("386");
              warnings.push(stryMutAct_9fa48("387") ? `` : (stryCov_9fa48("387"), `Skipped empty provider at index ${i}`));
              continue;
            }
          }

          // Basic domain validation (contains dot and no spaces)
          if (stryMutAct_9fa48("390") ? !trimmed.includes(".") && trimmed.includes(" ") : stryMutAct_9fa48("389") ? false : stryMutAct_9fa48("388") ? true : (stryCov_9fa48("388", "389", "390"), (stryMutAct_9fa48("391") ? trimmed.includes(".") : (stryCov_9fa48("391"), !trimmed.includes(stryMutAct_9fa48("392") ? "" : (stryCov_9fa48("392"), ".")))) || trimmed.includes(stryMutAct_9fa48("393") ? "" : (stryCov_9fa48("393"), " ")))) {
            if (stryMutAct_9fa48("394")) {
              {}
            } else {
              stryCov_9fa48("394");
              warnings.push(stryMutAct_9fa48("395") ? `` : (stryCov_9fa48("395"), `Suspicious provider format at index ${i}: "${trimmed}"`));
            }
          }

          // Check for potential XSS/injection attempts
          if (stryMutAct_9fa48("397") ? false : stryMutAct_9fa48("396") ? true : (stryCov_9fa48("396", "397"), this.containsSuspiciousContent(trimmed))) {
            if (stryMutAct_9fa48("398")) {
              {}
            } else {
              stryCov_9fa48("398");
              warnings.push(stryMutAct_9fa48("399") ? `` : (stryCov_9fa48("399"), `Potentially malicious provider at index ${i}: "${trimmed}"`));
              // Still include it but logged for monitoring
            }
          }
          sanitizedData.push(trimmed);
        }
      }
      return stryMutAct_9fa48("400") ? {} : (stryCov_9fa48("400"), {
        isValid: stryMutAct_9fa48("401") ? false : (stryCov_9fa48("401"), true),
        data: stryMutAct_9fa48("402") ? {} : (stryCov_9fa48("402"), {
          data: sanitizedData
        }),
        errors,
        warnings
      });
    }
  }

  /**
   * Validate and sanitize search results
   */
  static validateSearchResults(searchResults: any): ValidationResult<{
    results: Array<{
      id: string;
      title: string;
      description: string;
      provider: string;
      preferred: string;
      categories: string[];
    }>;
    pagination: {
      page: number;
      limit: number;
      total_results: number;
      total_pages: number;
      has_next: boolean;
      has_previous: boolean;
    };
  }> {
    if (stryMutAct_9fa48("403")) {
      {}
    } else {
      stryCov_9fa48("403");
      const errors: string[] = stryMutAct_9fa48("404") ? ["Stryker was here"] : (stryCov_9fa48("404"), []);
      const warnings: string[] = stryMutAct_9fa48("405") ? ["Stryker was here"] : (stryCov_9fa48("405"), []);
      if (stryMutAct_9fa48("408") ? !searchResults && typeof searchResults !== "object" : stryMutAct_9fa48("407") ? false : stryMutAct_9fa48("406") ? true : (stryCov_9fa48("406", "407", "408"), (stryMutAct_9fa48("409") ? searchResults : (stryCov_9fa48("409"), !searchResults)) || (stryMutAct_9fa48("411") ? typeof searchResults === "object" : stryMutAct_9fa48("410") ? false : (stryCov_9fa48("410", "411"), typeof searchResults !== (stryMutAct_9fa48("412") ? "" : (stryCov_9fa48("412"), "object")))))) {
        if (stryMutAct_9fa48("413")) {
          {}
        } else {
          stryCov_9fa48("413");
          errors.push(stryMutAct_9fa48("414") ? "" : (stryCov_9fa48("414"), "Search results must be an object"));
          return stryMutAct_9fa48("415") ? {} : (stryCov_9fa48("415"), {
            isValid: stryMutAct_9fa48("416") ? true : (stryCov_9fa48("416"), false),
            data: stryMutAct_9fa48("417") ? {} : (stryCov_9fa48("417"), {
              results: stryMutAct_9fa48("418") ? ["Stryker was here"] : (stryCov_9fa48("418"), []),
              pagination: stryMutAct_9fa48("419") ? {} : (stryCov_9fa48("419"), {
                page: 1,
                limit: 20,
                total_results: 0,
                total_pages: 0,
                has_next: stryMutAct_9fa48("420") ? true : (stryCov_9fa48("420"), false),
                has_previous: stryMutAct_9fa48("421") ? true : (stryCov_9fa48("421"), false)
              })
            }),
            errors,
            warnings
          });
        }
      }

      // Validate results array
      const results: any[] = stryMutAct_9fa48("422") ? ["Stryker was here"] : (stryCov_9fa48("422"), []);
      if (stryMutAct_9fa48("424") ? false : stryMutAct_9fa48("423") ? true : (stryCov_9fa48("423", "424"), Array.isArray(searchResults.results))) {
        if (stryMutAct_9fa48("425")) {
          {}
        } else {
          stryCov_9fa48("425");
          for (let i = 0; stryMutAct_9fa48("428") ? i >= searchResults.results.length : stryMutAct_9fa48("427") ? i <= searchResults.results.length : stryMutAct_9fa48("426") ? false : (stryCov_9fa48("426", "427", "428"), i < searchResults.results.length); stryMutAct_9fa48("429") ? i-- : (stryCov_9fa48("429"), i++)) {
            if (stryMutAct_9fa48("430")) {
              {}
            } else {
              stryCov_9fa48("430");
              const result = searchResults.results[i];
              if (stryMutAct_9fa48("433") ? result || typeof result === "object" : stryMutAct_9fa48("432") ? false : stryMutAct_9fa48("431") ? true : (stryCov_9fa48("431", "432", "433"), result && (stryMutAct_9fa48("435") ? typeof result !== "object" : stryMutAct_9fa48("434") ? true : (stryCov_9fa48("434", "435"), typeof result === (stryMutAct_9fa48("436") ? "" : (stryCov_9fa48("436"), "object")))))) {
                if (stryMutAct_9fa48("437")) {
                  {}
                } else {
                  stryCov_9fa48("437");
                  const sanitized = stryMutAct_9fa48("438") ? {} : (stryCov_9fa48("438"), {
                    id: String(stryMutAct_9fa48("441") ? result.id && `unknown-${i}` : stryMutAct_9fa48("440") ? false : stryMutAct_9fa48("439") ? true : (stryCov_9fa48("439", "440", "441"), result.id || (stryMutAct_9fa48("442") ? `` : (stryCov_9fa48("442"), `unknown-${i}`)))),
                    title: String(stryMutAct_9fa48("445") ? result.title && "Untitled API" : stryMutAct_9fa48("444") ? false : stryMutAct_9fa48("443") ? true : (stryCov_9fa48("443", "444", "445"), result.title || (stryMutAct_9fa48("446") ? "" : (stryCov_9fa48("446"), "Untitled API")))),
                    description: stryMutAct_9fa48("447") ? String(result.description || "") : (stryCov_9fa48("447"), String(stryMutAct_9fa48("450") ? result.description && "" : stryMutAct_9fa48("449") ? false : stryMutAct_9fa48("448") ? true : (stryCov_9fa48("448", "449", "450"), result.description || (stryMutAct_9fa48("451") ? "Stryker was here!" : (stryCov_9fa48("451"), "")))).substring(0, 500)),
                    provider: String(stryMutAct_9fa48("454") ? result.provider && "unknown" : stryMutAct_9fa48("453") ? false : stryMutAct_9fa48("452") ? true : (stryCov_9fa48("452", "453", "454"), result.provider || (stryMutAct_9fa48("455") ? "" : (stryCov_9fa48("455"), "unknown")))),
                    preferred: String(stryMutAct_9fa48("458") ? result.preferred && "v1" : stryMutAct_9fa48("457") ? false : stryMutAct_9fa48("456") ? true : (stryCov_9fa48("456", "457", "458"), result.preferred || (stryMutAct_9fa48("459") ? "" : (stryCov_9fa48("459"), "v1")))),
                    categories: Array.isArray(result.categories) ? stryMutAct_9fa48("461") ? result.categories.map((c: any) => String(c)).filter((c: string) => c.length > 0) : stryMutAct_9fa48("460") ? result.categories.filter((c: any) => c != null && c !== "").map((c: any) => String(c)) : (stryCov_9fa48("460", "461"), result.categories.filter(stryMutAct_9fa48("462") ? () => undefined : (stryCov_9fa48("462"), (c: any) => stryMutAct_9fa48("465") ? c != null || c !== "" : stryMutAct_9fa48("464") ? false : stryMutAct_9fa48("463") ? true : (stryCov_9fa48("463", "464", "465"), (stryMutAct_9fa48("467") ? c == null : stryMutAct_9fa48("466") ? true : (stryCov_9fa48("466", "467"), c != null)) && (stryMutAct_9fa48("469") ? c === "" : stryMutAct_9fa48("468") ? true : (stryCov_9fa48("468", "469"), c !== (stryMutAct_9fa48("470") ? "Stryker was here!" : (stryCov_9fa48("470"), ""))))))).map(stryMutAct_9fa48("471") ? () => undefined : (stryCov_9fa48("471"), (c: any) => String(c))).filter(stryMutAct_9fa48("472") ? () => undefined : (stryCov_9fa48("472"), (c: string) => stryMutAct_9fa48("476") ? c.length <= 0 : stryMutAct_9fa48("475") ? c.length >= 0 : stryMutAct_9fa48("474") ? false : stryMutAct_9fa48("473") ? true : (stryCov_9fa48("473", "474", "475", "476"), c.length > 0)))) : stryMutAct_9fa48("477") ? ["Stryker was here"] : (stryCov_9fa48("477"), [])
                  });

                  // Check for suspicious content
                  if (stryMutAct_9fa48("480") ? (this.containsSuspiciousContent(sanitized.id) || this.containsSuspiciousContent(sanitized.title)) && this.containsSuspiciousContent(sanitized.description) : stryMutAct_9fa48("479") ? false : stryMutAct_9fa48("478") ? true : (stryCov_9fa48("478", "479", "480"), (stryMutAct_9fa48("482") ? this.containsSuspiciousContent(sanitized.id) && this.containsSuspiciousContent(sanitized.title) : stryMutAct_9fa48("481") ? false : (stryCov_9fa48("481", "482"), this.containsSuspiciousContent(sanitized.id) || this.containsSuspiciousContent(sanitized.title))) || this.containsSuspiciousContent(sanitized.description))) {
                    if (stryMutAct_9fa48("483")) {
                      {}
                    } else {
                      stryCov_9fa48("483");
                      warnings.push(stryMutAct_9fa48("484") ? `` : (stryCov_9fa48("484"), `Potentially malicious content in search result ${i}`));
                    }
                  }
                  results.push(sanitized);
                }
              } else {
                if (stryMutAct_9fa48("485")) {
                  {}
                } else {
                  stryCov_9fa48("485");
                  warnings.push(stryMutAct_9fa48("486") ? `` : (stryCov_9fa48("486"), `Skipped invalid search result at index ${i}`));
                }
              }
            }
          }
        }
      } else {
        if (stryMutAct_9fa48("487")) {
          {}
        } else {
          stryCov_9fa48("487");
          warnings.push(stryMutAct_9fa48("488") ? "" : (stryCov_9fa48("488"), "Search results.results must be an array, using empty array"));
        }
      }

      // Validate pagination
      const paginationPage = this.validateNumber(stryMutAct_9fa48("489") ? searchResults.pagination.page : (stryCov_9fa48("489"), searchResults.pagination?.page), stryMutAct_9fa48("490") ? "" : (stryCov_9fa48("490"), "pagination.page"), warnings);
      const paginationLimit = this.validateNumber(stryMutAct_9fa48("491") ? searchResults.pagination.limit : (stryCov_9fa48("491"), searchResults.pagination?.limit), stryMutAct_9fa48("492") ? "" : (stryCov_9fa48("492"), "pagination.limit"), warnings);
      const paginationTotalResults = this.validateNumber(stryMutAct_9fa48("493") ? searchResults.pagination.total_results : (stryCov_9fa48("493"), searchResults.pagination?.total_results), stryMutAct_9fa48("494") ? "" : (stryCov_9fa48("494"), "pagination.total_results"), warnings);
      const paginationTotalPages = this.validateNumber(stryMutAct_9fa48("495") ? searchResults.pagination.total_pages : (stryCov_9fa48("495"), searchResults.pagination?.total_pages), stryMutAct_9fa48("496") ? "" : (stryCov_9fa48("496"), "pagination.total_pages"), warnings);
      const pagination = stryMutAct_9fa48("497") ? {} : (stryCov_9fa48("497"), {
        page: (stryMutAct_9fa48("501") ? paginationPage <= 0 : stryMutAct_9fa48("500") ? paginationPage >= 0 : stryMutAct_9fa48("499") ? false : stryMutAct_9fa48("498") ? true : (stryCov_9fa48("498", "499", "500", "501"), paginationPage > 0)) ? paginationPage : 1,
        limit: (stryMutAct_9fa48("505") ? paginationLimit <= 0 : stryMutAct_9fa48("504") ? paginationLimit >= 0 : stryMutAct_9fa48("503") ? false : stryMutAct_9fa48("502") ? true : (stryCov_9fa48("502", "503", "504", "505"), paginationLimit > 0)) ? paginationLimit : 20,
        total_results: (stryMutAct_9fa48("509") ? paginationTotalResults < 0 : stryMutAct_9fa48("508") ? paginationTotalResults > 0 : stryMutAct_9fa48("507") ? false : stryMutAct_9fa48("506") ? true : (stryCov_9fa48("506", "507", "508", "509"), paginationTotalResults >= 0)) ? paginationTotalResults : results.length,
        total_pages: (stryMutAct_9fa48("513") ? paginationTotalPages <= 0 : stryMutAct_9fa48("512") ? paginationTotalPages >= 0 : stryMutAct_9fa48("511") ? false : stryMutAct_9fa48("510") ? true : (stryCov_9fa48("510", "511", "512", "513"), paginationTotalPages > 0)) ? paginationTotalPages : 1,
        has_next: Boolean(stryMutAct_9fa48("514") ? searchResults.pagination.has_next : (stryCov_9fa48("514"), searchResults.pagination?.has_next)),
        has_previous: Boolean(stryMutAct_9fa48("515") ? searchResults.pagination.has_previous : (stryCov_9fa48("515"), searchResults.pagination?.has_previous))
      });
      return stryMutAct_9fa48("516") ? {} : (stryCov_9fa48("516"), {
        isValid: stryMutAct_9fa48("517") ? false : (stryCov_9fa48("517"), true),
        data: stryMutAct_9fa48("518") ? {} : (stryCov_9fa48("518"), {
          results,
          pagination
        }),
        errors,
        warnings
      });
    }
  }

  /**
   * Validate and sanitize metrics data
   */
  static validateMetrics(metrics: any): ValidationResult<{
    numSpecs: number;
    numAPIs: number;
    numEndpoints: number;
    [key: string]: any;
  }> {
    if (stryMutAct_9fa48("519")) {
      {}
    } else {
      stryCov_9fa48("519");
      const errors: string[] = stryMutAct_9fa48("520") ? ["Stryker was here"] : (stryCov_9fa48("520"), []);
      const warnings: string[] = stryMutAct_9fa48("521") ? ["Stryker was here"] : (stryCov_9fa48("521"), []);
      if (stryMutAct_9fa48("524") ? !metrics && typeof metrics !== "object" : stryMutAct_9fa48("523") ? false : stryMutAct_9fa48("522") ? true : (stryCov_9fa48("522", "523", "524"), (stryMutAct_9fa48("525") ? metrics : (stryCov_9fa48("525"), !metrics)) || (stryMutAct_9fa48("527") ? typeof metrics === "object" : stryMutAct_9fa48("526") ? false : (stryCov_9fa48("526", "527"), typeof metrics !== (stryMutAct_9fa48("528") ? "" : (stryCov_9fa48("528"), "object")))))) {
        if (stryMutAct_9fa48("529")) {
          {}
        } else {
          stryCov_9fa48("529");
          errors.push(stryMutAct_9fa48("530") ? "" : (stryCov_9fa48("530"), "Metrics response must be an object"));
          return stryMutAct_9fa48("531") ? {} : (stryCov_9fa48("531"), {
            isValid: stryMutAct_9fa48("532") ? true : (stryCov_9fa48("532"), false),
            data: stryMutAct_9fa48("533") ? {} : (stryCov_9fa48("533"), {
              numSpecs: 0,
              numAPIs: 0,
              numEndpoints: 0
            }),
            errors,
            warnings
          });
        }
      }

      // Validate and sanitize numeric fields
      const numSpecs = this.validateNumber(metrics.numSpecs, stryMutAct_9fa48("534") ? "" : (stryCov_9fa48("534"), "numSpecs"), warnings);
      const numAPIs = this.validateNumber(metrics.numAPIs, stryMutAct_9fa48("535") ? "" : (stryCov_9fa48("535"), "numAPIs"), warnings);
      const numEndpoints = this.validateNumber(metrics.numEndpoints, stryMutAct_9fa48("536") ? "" : (stryCov_9fa48("536"), "numEndpoints"), warnings);

      // Preserve other fields but validate them
      const sanitizedMetrics = stryMutAct_9fa48("537") ? {} : (stryCov_9fa48("537"), {
        numSpecs,
        numAPIs,
        numEndpoints,
        ...this.sanitizeObject(metrics, stryMutAct_9fa48("538") ? [] : (stryCov_9fa48("538"), [stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), "numSpecs"), stryMutAct_9fa48("540") ? "" : (stryCov_9fa48("540"), "numAPIs"), stryMutAct_9fa48("541") ? "" : (stryCov_9fa48("541"), "numEndpoints")]), warnings)
      });
      return stryMutAct_9fa48("542") ? {} : (stryCov_9fa48("542"), {
        isValid: stryMutAct_9fa48("543") ? false : (stryCov_9fa48("543"), true),
        data: sanitizedMetrics,
        errors,
        warnings
      });
    }
  }

  /**
   * Check for potentially suspicious content (XSS, injection attempts)
   * Uses DOMPurify for robust HTML sanitization instead of regex patterns
   */
  private static containsSuspiciousContent(str: string): boolean {
    if (stryMutAct_9fa48("544")) {
      {}
    } else {
      stryCov_9fa48("544");
      try {
        if (stryMutAct_9fa48("545")) {
          {}
        } else {
          stryCov_9fa48("545");
          // First check for non-HTML threats (URLs, standalone event handlers)
          const nonHtmlPatterns = stryMutAct_9fa48("546") ? [] : (stryCov_9fa48("546"), [/javascript:/gi, /vbscript:/gi, stryMutAct_9fa48("547") ? /data:.base64/gi : (stryCov_9fa48("547"), /data:.*base64/gi), stryMutAct_9fa48("551") ? /on\w+\S*=/gi : stryMutAct_9fa48("550") ? /on\w+\s=/gi : stryMutAct_9fa48("549") ? /on\W+\s*=/gi : stryMutAct_9fa48("548") ? /on\w\s*=/gi : (stryCov_9fa48("548", "549", "550", "551"), /on\w+\s*=/gi) // Event handlers like onclick=
          ]);
          const hasNonHtmlThreats = stryMutAct_9fa48("552") ? nonHtmlPatterns.every(pattern => pattern.test(str)) : (stryCov_9fa48("552"), nonHtmlPatterns.some(stryMutAct_9fa48("553") ? () => undefined : (stryCov_9fa48("553"), pattern => pattern.test(str))));

          // Check for SQL injection patterns
          const sqlPatterns = stryMutAct_9fa48("554") ? [] : (stryCov_9fa48("554"), [stryMutAct_9fa48("556") ? /\bDROP\S+TABLE\b/gi : stryMutAct_9fa48("555") ? /\bDROP\sTABLE\b/gi : (stryCov_9fa48("555", "556"), /\bDROP\s+TABLE\b/gi), stryMutAct_9fa48("560") ? /\bSELECT\s+\*\S+FROM\b/gi : stryMutAct_9fa48("559") ? /\bSELECT\s+\*\sFROM\b/gi : stryMutAct_9fa48("558") ? /\bSELECT\S+\*\s+FROM\b/gi : stryMutAct_9fa48("557") ? /\bSELECT\s\*\s+FROM\b/gi : (stryCov_9fa48("557", "558", "559", "560"), /\bSELECT\s+\*\s+FROM\b/gi), stryMutAct_9fa48("562") ? /['";].--/gi : stryMutAct_9fa48("561") ? /[^'";].*--/gi : (stryCov_9fa48("561", "562"), /['";].*--/gi)]);
          const hasSqlInjection = stryMutAct_9fa48("563") ? sqlPatterns.every(pattern => pattern.test(str)) : (stryCov_9fa48("563"), sqlPatterns.some(stryMutAct_9fa48("564") ? () => undefined : (stryCov_9fa48("564"), pattern => pattern.test(str))));

          // Use DOMPurify for HTML/XSS detection
          const window = new JSDOM(stryMutAct_9fa48("565") ? "Stryker was here!" : (stryCov_9fa48("565"), "")).window;
          const purify = DOMPurify(window as any);

          // Sanitize the string with very strict settings
          const sanitized = purify.sanitize(str, stryMutAct_9fa48("566") ? {} : (stryCov_9fa48("566"), {
            ALLOWED_TAGS: stryMutAct_9fa48("567") ? ["Stryker was here"] : (stryCov_9fa48("567"), []),
            // No HTML tags allowed
            ALLOWED_ATTR: stryMutAct_9fa48("568") ? ["Stryker was here"] : (stryCov_9fa48("568"), []),
            // No attributes allowed
            KEEP_CONTENT: stryMutAct_9fa48("569") ? false : (stryCov_9fa48("569"), true),
            // Keep text content
            FORBID_TAGS: stryMutAct_9fa48("570") ? [] : (stryCov_9fa48("570"), [stryMutAct_9fa48("571") ? "" : (stryCov_9fa48("571"), "script"), stryMutAct_9fa48("572") ? "" : (stryCov_9fa48("572"), "style"), stryMutAct_9fa48("573") ? "" : (stryCov_9fa48("573"), "iframe"), stryMutAct_9fa48("574") ? "" : (stryCov_9fa48("574"), "object"), stryMutAct_9fa48("575") ? "" : (stryCov_9fa48("575"), "embed")]),
            FORBID_ATTR: stryMutAct_9fa48("576") ? [] : (stryCov_9fa48("576"), [stryMutAct_9fa48("577") ? "" : (stryCov_9fa48("577"), "onclick"), stryMutAct_9fa48("578") ? "" : (stryCov_9fa48("578"), "onload"), stryMutAct_9fa48("579") ? "" : (stryCov_9fa48("579"), "onerror"), stryMutAct_9fa48("580") ? "" : (stryCov_9fa48("580"), "javascript"), stryMutAct_9fa48("581") ? "" : (stryCov_9fa48("581"), "vbscript")])
          }));
          const hasHtmlThreats = stryMutAct_9fa48("584") ? sanitized === str : stryMutAct_9fa48("583") ? false : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583", "584"), sanitized !== str);

          // Return true if any threats are detected
          return stryMutAct_9fa48("587") ? (hasNonHtmlThreats || hasSqlInjection) && hasHtmlThreats : stryMutAct_9fa48("586") ? false : stryMutAct_9fa48("585") ? true : (stryCov_9fa48("585", "586", "587"), (stryMutAct_9fa48("589") ? hasNonHtmlThreats && hasSqlInjection : stryMutAct_9fa48("588") ? false : (stryCov_9fa48("588", "589"), hasNonHtmlThreats || hasSqlInjection)) || hasHtmlThreats);
        }
      } catch (error) {
        if (stryMutAct_9fa48("590")) {
          {}
        } else {
          stryCov_9fa48("590");
          // If DOMPurify fails, fall back to basic checks
          const basicPatterns = stryMutAct_9fa48("591") ? [] : (stryCov_9fa48("591"), [/<script/i, /javascript:/i, stryMutAct_9fa48("595") ? /on\w+\S*=/i : stryMutAct_9fa48("594") ? /on\w+\s=/i : stryMutAct_9fa48("593") ? /on\W+\s*=/i : stryMutAct_9fa48("592") ? /on\w\s*=/i : (stryCov_9fa48("592", "593", "594", "595"), /on\w+\s*=/i), stryMutAct_9fa48("597") ? /\bDROP\S+TABLE\b/gi : stryMutAct_9fa48("596") ? /\bDROP\sTABLE\b/gi : (stryCov_9fa48("596", "597"), /\bDROP\s+TABLE\b/gi), stryMutAct_9fa48("601") ? /\bSELECT\s+\*\S+FROM\b/gi : stryMutAct_9fa48("600") ? /\bSELECT\s+\*\sFROM\b/gi : stryMutAct_9fa48("599") ? /\bSELECT\S+\*\s+FROM\b/gi : stryMutAct_9fa48("598") ? /\bSELECT\s\*\s+FROM\b/gi : (stryCov_9fa48("598", "599", "600", "601"), /\bSELECT\s+\*\s+FROM\b/gi)]);
          return stryMutAct_9fa48("602") ? basicPatterns.every(pattern => pattern.test(str)) : (stryCov_9fa48("602"), basicPatterns.some(stryMutAct_9fa48("603") ? () => undefined : (stryCov_9fa48("603"), pattern => pattern.test(str))));
        }
      }
    }
  }

  /**
   * Validate a number field and provide fallback
   */
  private static validateNumber(value: any, fieldName: string, warnings: string[]): number {
    if (stryMutAct_9fa48("604")) {
      {}
    } else {
      stryCov_9fa48("604");
      if (stryMutAct_9fa48("607") ? typeof value === "number" && !isNaN(value) || value >= 0 : stryMutAct_9fa48("606") ? false : stryMutAct_9fa48("605") ? true : (stryCov_9fa48("605", "606", "607"), (stryMutAct_9fa48("609") ? typeof value === "number" || !isNaN(value) : stryMutAct_9fa48("608") ? true : (stryCov_9fa48("608", "609"), (stryMutAct_9fa48("611") ? typeof value !== "number" : stryMutAct_9fa48("610") ? true : (stryCov_9fa48("610", "611"), typeof value === (stryMutAct_9fa48("612") ? "" : (stryCov_9fa48("612"), "number")))) && (stryMutAct_9fa48("613") ? isNaN(value) : (stryCov_9fa48("613"), !isNaN(value))))) && (stryMutAct_9fa48("616") ? value < 0 : stryMutAct_9fa48("615") ? value > 0 : stryMutAct_9fa48("614") ? true : (stryCov_9fa48("614", "615", "616"), value >= 0)))) {
        if (stryMutAct_9fa48("617")) {
          {}
        } else {
          stryCov_9fa48("617");
          return Math.floor(value); // Ensure integer
        }
      }
      if (stryMutAct_9fa48("620") ? typeof value !== "string" : stryMutAct_9fa48("619") ? false : stryMutAct_9fa48("618") ? true : (stryCov_9fa48("618", "619", "620"), typeof value === (stryMutAct_9fa48("621") ? "" : (stryCov_9fa48("621"), "string")))) {
        if (stryMutAct_9fa48("622")) {
          {}
        } else {
          stryCov_9fa48("622");
          const parsed = parseInt(value, 10);
          if (stryMutAct_9fa48("625") ? !isNaN(parsed) || parsed >= 0 : stryMutAct_9fa48("624") ? false : stryMutAct_9fa48("623") ? true : (stryCov_9fa48("623", "624", "625"), (stryMutAct_9fa48("626") ? isNaN(parsed) : (stryCov_9fa48("626"), !isNaN(parsed))) && (stryMutAct_9fa48("629") ? parsed < 0 : stryMutAct_9fa48("628") ? parsed > 0 : stryMutAct_9fa48("627") ? true : (stryCov_9fa48("627", "628", "629"), parsed >= 0)))) {
            if (stryMutAct_9fa48("630")) {
              {}
            } else {
              stryCov_9fa48("630");
              warnings.push(stryMutAct_9fa48("631") ? `` : (stryCov_9fa48("631"), `Converted string to number for ${fieldName}: "${value}" -> ${parsed}`));
              return parsed;
            }
          }
        }
      }
      warnings.push(stryMutAct_9fa48("632") ? `` : (stryCov_9fa48("632"), `Invalid ${fieldName} value: ${value}, using 0`));
      return 0;
    }
  }

  /**
   * Sanitize an object by excluding specified keys and validating remaining ones
   */
  private static sanitizeObject(obj: any, excludeKeys: string[], warnings: string[]): Record<string, any> {
    if (stryMutAct_9fa48("633")) {
      {}
    } else {
      stryCov_9fa48("633");
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (stryMutAct_9fa48("634")) {
          {}
        } else {
          stryCov_9fa48("634");
          if (stryMutAct_9fa48("636") ? false : stryMutAct_9fa48("635") ? true : (stryCov_9fa48("635", "636"), excludeKeys.includes(key))) {
            if (stryMutAct_9fa48("637")) {
              {}
            } else {
              stryCov_9fa48("637");
              continue;
            }
          }

          // Skip functions and symbols
          if (stryMutAct_9fa48("640") ? typeof value === "function" && typeof value === "symbol" : stryMutAct_9fa48("639") ? false : stryMutAct_9fa48("638") ? true : (stryCov_9fa48("638", "639", "640"), (stryMutAct_9fa48("642") ? typeof value !== "function" : stryMutAct_9fa48("641") ? false : (stryCov_9fa48("641", "642"), typeof value === (stryMutAct_9fa48("643") ? "" : (stryCov_9fa48("643"), "function")))) || (stryMutAct_9fa48("645") ? typeof value !== "symbol" : stryMutAct_9fa48("644") ? false : (stryCov_9fa48("644", "645"), typeof value === (stryMutAct_9fa48("646") ? "" : (stryCov_9fa48("646"), "symbol")))))) {
            if (stryMutAct_9fa48("647")) {
              {}
            } else {
              stryCov_9fa48("647");
              warnings.push(stryMutAct_9fa48("648") ? `` : (stryCov_9fa48("648"), `Skipped ${typeof value} property: ${key}`));
              continue;
            }
          }

          // Handle potential XSS in string values
          if (stryMutAct_9fa48("651") ? typeof value === "string" || this.containsSuspiciousContent(value) : stryMutAct_9fa48("650") ? false : stryMutAct_9fa48("649") ? true : (stryCov_9fa48("649", "650", "651"), (stryMutAct_9fa48("653") ? typeof value !== "string" : stryMutAct_9fa48("652") ? true : (stryCov_9fa48("652", "653"), typeof value === (stryMutAct_9fa48("654") ? "" : (stryCov_9fa48("654"), "string")))) && this.containsSuspiciousContent(value))) {
            if (stryMutAct_9fa48("655")) {
              {}
            } else {
              stryCov_9fa48("655");
              warnings.push(stryMutAct_9fa48("656") ? `` : (stryCov_9fa48("656"), `Potentially suspicious content in ${key}: "${value}"`));
            }
          }
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
  }

  /**
   * Log validation results appropriately
   */
  static logValidationResults<T>(result: ValidationResult<T>, source: string): void {
    if (stryMutAct_9fa48("657")) {
      {}
    } else {
      stryCov_9fa48("657");
      // Import ErrorHandler dynamically to avoid circular dependency
      const {
        ErrorHandler
      } = require("./errors.js");
      if (stryMutAct_9fa48("661") ? result.errors.length <= 0 : stryMutAct_9fa48("660") ? result.errors.length >= 0 : stryMutAct_9fa48("659") ? false : stryMutAct_9fa48("658") ? true : (stryCov_9fa48("658", "659", "660", "661"), result.errors.length > 0)) {
        if (stryMutAct_9fa48("662")) {
          {}
        } else {
          stryCov_9fa48("662");
          ErrorHandler.logError({
            code: "VALIDATION_ERROR",
            message: `Validation errors in ${source}`,
            context: {
              errors: result.errors
            },
            timestamp: new Date()
          } as any);
        }
      }
      if (stryMutAct_9fa48("666") ? result.warnings.length <= 0 : stryMutAct_9fa48("665") ? result.warnings.length >= 0 : stryMutAct_9fa48("664") ? false : stryMutAct_9fa48("663") ? true : (stryCov_9fa48("663", "664", "665", "666"), result.warnings.length > 0)) {
        if (stryMutAct_9fa48("667")) {
          {}
        } else {
          stryCov_9fa48("667");
          ErrorHandler.logError({
            code: "VALIDATION_WARNING",
            message: `Validation warnings in ${source}`,
            context: {
              warnings: result.warnings
            },
            timestamp: new Date()
          } as any);
        }
      }
    }
  }
}

/**
 * Convenience function to validate and sanitize data with automatic logging
 */
export function validateAndSanitize<T>(data: any, validator: (data: any) => ValidationResult<T>, source: string): T {
  if (stryMutAct_9fa48("668")) {
    {}
  } else {
    stryCov_9fa48("668");
    const result = validator(data);
    DataValidator.logValidationResults(result, source);
    return result.data;
  }
}