using System.Drawing;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;

namespace Backend.Converter
{
    public static class Converter
    {
        #region Private vairables
        static private char strCharPlusSign = '+';
        static private char strCharSlash = '/';
        #endregion

        #region Privates functions
        static private char SixBitToChar(byte b)
        {
            char c;
            if (b < 26)
            {
                c = (char)((int)b + (int)'A');
            }
            else if (b < 52)
            {
                c = (char)((int)b - 26 + (int)'a');
            }
            else if (b < 62)
            {
                c = (char)((int)b - 52 + (int)'0');
            }
            else if (b == 62)
            {
                c = strCharPlusSign;
            }
            else
            {
                c = strCharSlash;
            }
            return c;
        }

        static private byte CharToSixBit(char c)
        {
            byte b;
            if (c >= 'A' && c <= 'Z')
            {
                b = (byte)((int)c - (int)'A');
            }
            else if (c >= 'a' && c <= 'z')
            {
                b = (byte)((int)c - (int)'a' + 26);
            }
            else if (c >= '0' && c <= '9')
            {
                b = (byte)((int)c - (int)'0' + 52);
            }
            else if (c == strCharPlusSign)
            {
                b = (byte)62;
            }
            else
            {
                b = (byte)63;
            }
            return b;
        }
        #endregion



        #region Properties
        /// <summary>
        /// Gets or sets the plus sign character.
        /// Default is '+'.
        /// </summary>
        public static char CharPlusSign
        {
            get
            {
                return strCharPlusSign;
            }
            set
            {
                strCharPlusSign = value;
            }
        }

        /// <summary>
        /// Gets or sets the slash character.
        /// Default is '/'.
        /// </summary>
        public static char CharSlash
        {
            get
            {
                return strCharSlash;
            }
            set
            {
                strCharSlash = value;
            }
        }
        #endregion

        #region Convert object? to base types
        public static byte ToByte(object? input)
        {
            try
            {
                byte val = byte.Parse(input + string.Empty);
                return val;
            }
            catch
            {
                return 0;
            }
        }

        public static byte[]? ToByteArray(object? input)
        {
            try
            {
                if (input == null || input == DBNull.Value)
                    return null;
                byte[] val = (byte[])input;
                return val;
            }
            catch
            {
                return null;
            }
        }

        public static long ToInt64(object? input, long defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value) return defaultVal;
                string str = input + string.Empty;
                if (input == null)
                    return defaultVal;
                long d = Int64.Parse(str);
                int val = (int)d;
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }

        public static int ToInt(object? input, int defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value || string.IsNullOrEmpty(input + ""))
                    return defaultVal;
                decimal d = decimal.Parse(input?.ToString() + string.Empty);
                int ret = (int)d;
                return ret;
            }
            catch
            {
                return defaultVal;
            }
        }
        public static long ToInt64(object? input)
        {
            return ToInt64(input, 0);
        }
        public static int ToInt(object? input)
        {
            return ToInt(input, 0);
        }

        public static double ToDouble(object? input)
        {
            return ToDouble(input, 0);
        }

        public static double ToDouble(object? input, double defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value) return defaultVal;
                double val = double.Parse(input + string.Empty);
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }
        public static double ToDouble(object? input, bool round)
        {
            try
            {
                if (input == null || input == DBNull.Value) return 0;
                double val = Convert.ToDouble(input);
                if (round)
                    val = (double)Math.Round((decimal)val);
                return val;
            }
            catch
            {
                return 0;
            }
        }
        public static long ToLong(object? input)
        {
            return ToLong(input, 0);
        }

        public static long ToLong(object? input, long defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value) return defaultVal;
                long val = long.Parse(input + string.Empty);
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }

        public static float ToFloat(object? input, float defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value) return defaultVal;
                float val = float.Parse(input + string.Empty);
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }

        public static float ToFloat(object? input, bool round)
        {
            try
            {
                if (input == null || input == DBNull.Value) return 0;
                float val = float.Parse(input + string.Empty);
                if (round)
                    val = (float)Math.Round((decimal)val);
                return val;
            }
            catch
            {
                return 0;
            }
        }

        public static float ToFloat(object? input)
        {
            return ToFloat(input, 0);
        }

        public static Guid ToGuid(object? input)
        {
            try
            {
                Guid val = new Guid(input + string.Empty);
                return val;
            }
            catch
            {
                return Guid.NewGuid();
            }
        }

        public static decimal ToDecimal(object? input, decimal defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value)
                    return defaultVal;
                decimal val = 0;
                decimal.TryParse(input + string.Empty, out val);
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }

        public static decimal ToDecimal(object? input)
        {
            return ToDecimal(input, 0);
        }

        public static bool ToBool(object? input, bool defaultVal)
        {
            try
            {
                string strInput = input + string.Empty;
                strInput = strInput.ToLower();
                if (strInput != null && (strInput == "yes" || strInput == "true"))
                    return true;
                if (strInput != null && (strInput == "no" || strInput == "false"))
                    return false;
                if (strInput != null && (strInput == "1"))
                    return true;
                if (strInput != null && (strInput == "0"))
                    return false;
                bool val = false;
                bool.TryParse(strInput, out val);
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }

        public static bool ToBool(object? input)
        {
            return ToBool(input, false);
        }
        public static int GetWeekOfMonth(DateTime date)
        {
            // Lấy ngày đầu tiên của tháng
            DateTime firstDayOfMonth = new DateTime(date.Year, date.Month, 1);

            // Xác định ngày trong tuần của ngày đầu tiên (Chủ nhật = 0, Thứ hai = 1, …)
            int firstDayOfWeek = (int)firstDayOfMonth.DayOfWeek;
            if (firstDayOfWeek == 0) firstDayOfWeek = 7; // chuyển Chủ nhật thành 7 cho dễ tính

            // Công thức tính tuần
            return (int)Math.Ceiling((date.Day + firstDayOfWeek - 1) / 7.0);
        }
        public static DateTime ToDateTimeFromYMD(object? input)
        {
            try
            {
                if (input == null || input == DBNull.Value || string.IsNullOrEmpty(input + ""))
                    return DateTime.MinValue;
                var str = input + string.Empty;
                if (str.Length == 8)
                {
                    DateTime val = new DateTime(ToInt(str.Substring(0, 4)),
                        ToInt(str.Substring(4, 2)),
                        ToInt(str.Substring(6, 2)));
                    return val;
                }
            }
            catch
            {
                return DateTime.MinValue;
            }
            return DateTime.MinValue;
        }
        public static DateTime ToDateTime(object? input, DateTime defaultVal)
        {
            try
            {
                if (input == null || input == DBNull.Value || string.IsNullOrEmpty(input + ""))
                    return defaultVal;
                DateTime val = DateTime.Parse(input + string.Empty);
                return val;
            }
            catch
            {
                return defaultVal;
            }
        }
        public static int? DateStringToInt(string? input)
        {
            int? output = null;
            if (string.IsNullOrEmpty(input))
            {
                return null;
            }
            var inputs = input.Split('/');
            if (inputs.Length == 3)
            {
                var ngay = inputs[2] + (inputs[1].Length==2? inputs[1]:"0"+ inputs[1]) + (inputs[0].Length == 2 ? inputs[0] : "0" + inputs[0]);
                output = Converter.ToInt(ngay);
            }
            return output;
        }
        public static int? DateStringMDYToInt(string? input)
        {
            int? output = null;
            if (string.IsNullOrEmpty(input))
            {
                return null;
            }
            var inputs = input.Split('/');
            if (inputs.Length == 3)
            {
                var ngay = inputs[2] + (inputs[0].Length == 2 ? inputs[0] : "0" + inputs[0]) + (inputs[1].Length == 2 ? inputs[1] : "0" + inputs[1]);
                output = Converter.ToInt(ngay);
            }
            return output;
        }
        public static DateTime ToDateTime(object? input)
        {
            return ToDateTime(input, DateTime.MinValue);
        }

        public static DateTime ToDateTime(object? input, bool vnFormat)
        {
            try
            {
                string strInput = input + string.Empty;
                strInput += string.Empty;
                if (strInput.IndexOf(" ") > 0)
                    strInput = strInput.Substring(0, strInput.IndexOf(" "));
                string[] dateParts = strInput.Split('/');
                if (dateParts.Length != 3) return DateTime.MinValue;
                return new DateTime(ToInt(dateParts[2]), ToInt(dateParts[1]), ToInt(dateParts[0]));
            }
            catch
            {
                return DateTime.MinValue;
            }
        }
        public static string GetQuaterOfYear(DateTime date, bool caplock)
        {
            string str = "";
            if (date.Month <= 3)
                str = "Quý 1 năm " + date.Year;
            if (date.Month > 3 && date.Month <= 6)
                str = "Quý 2 năm " + date.Year;
            if (date.Month > 6 && date.Month <= 9)
                str = "Quý 3 năm " + date.Year;
            if (date.Month > 9)
                str = "Quý 4 năm " + date.Year;
            if (caplock)
                str = str.ToUpper();
            return str;
        }

        public static TimeSpan ToTimeSpan(object? input)
        {
            if (string.IsNullOrEmpty(input + string.Empty))
                return DateTime.Now.TimeOfDay;
            string[] timeParts = (input + string.Empty).Split(':');
            if (timeParts.Length != 2)
                return DateTime.Now.TimeOfDay;
            if (string.IsNullOrEmpty(timeParts[0]) || string.IsNullOrEmpty(timeParts[1]))
                return DateTime.Now.TimeOfDay;
            return TimeSpan.FromHours(Converter.ToDouble(timeParts[0])).Add(TimeSpan.FromMinutes(Converter.ToDouble(timeParts[1])));
        }

        public static object? ParseEnum(Type type, object? input)
        {
            try
            {
                return Enum.Parse(type, input + string.Empty, false);
            }
            catch
            {
                return Activator.CreateInstance(type);
            }
        }

        public static XmlDocument? ParseXmlDocument(string xmlString)
        {
            try
            {
                XmlDocument doc = new XmlDocument();
                doc.LoadXml(xmlString);
                return doc;
            }
            catch
            {
                return null;
            }
        }

        public static string ToString(object? input)
        {
            try
            {
                if (input == null)
                    return string.Empty;
                else
                    return input + string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        public static string Base64ToString(byte[]? data)
        {
            int length = data == null ? 0 : data.Length;
            if (length == 0 || data == null)
                return String.Empty;

            int padding = length % 3;
            if (padding > 0)
                padding = 3 - padding;
            int blocks = (length - 1) / 3 + 1;

            char[] s = new char[blocks * 4];

            for (int i = 0; i < blocks; i++)
            {
                bool finalBlock = i == blocks - 1;
                bool pad2 = false;
                bool pad1 = false;
                if (finalBlock)
                {
                    pad2 = padding == 2;
                    pad1 = padding > 0;
                }

                int index = i * 3;
                byte b1 = data[index];
                byte b2 = pad2 ? (byte)0 : data[index + 1];
                byte b3 = pad1 ? (byte)0 : data[index + 2];

                byte temp1 = (byte)((b1 & 0xFC) >> 2);

                byte temp = (byte)((b1 & 0x03) << 4);
                byte temp2 = (byte)((b2 & 0xF0) >> 4);
                temp2 += temp;

                temp = (byte)((b2 & 0x0F) << 2);
                byte temp3 = (byte)((b3 & 0xC0) >> 6);
                temp3 += temp;

                byte temp4 = (byte)(b3 & 0x3F);

                index = i * 4;
                s[index] = SixBitToChar(temp1);
                s[index + 1] = SixBitToChar(temp2);
                s[index + 2] = pad2 ? '=' : SixBitToChar(temp3);
                s[index + 3] = pad1 ? '=' : SixBitToChar(temp4);
            }

            return new string(s);
        }

        public static byte[] StringToBase64(string? s)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(s))
                    return Array.Empty<byte>();

                var length = s.Length;
                if (length == 0)
                    return Array.Empty<byte>();

                var padding = length switch
                {
                    > 2 when s[length - 2] == '=' => 2,
                    > 1 when s[length - 1] == '=' => 1,
                    _ => 0
                };

                var blocks = (length - 1) / 4 + 1;
                var bytes = blocks * 3;

                var data = new byte[bytes - padding];

                for (var i = 0; i < blocks; i++)
                {
                    var finalBlock = i == blocks - 1;
                    var pad2 = false;
                    var pad1 = false;
                    if (finalBlock)
                    {
                        pad2 = padding == 2;
                        pad1 = padding > 0;
                    }

                    var index = i * 4;
                    var temp1 = CharToSixBit(s[index]);
                    var temp2 = CharToSixBit(s[index + 1]);
                    var temp3 = CharToSixBit(s[index + 2]);
                    var temp4 = CharToSixBit(s[index + 3]);

                    var b = (byte)(temp1 << 2);
                    var b1 = (byte)((temp2 & 0x30) >> 4);
                    b1 += b;

                    b = (byte)((temp2 & 0x0F) << 4);
                    var b2 = (byte)((temp3 & 0x3C) >> 2);
                    b2 += b;

                    b = (byte)((temp3 & 0x03) << 6);
                    var b3 = temp4;
                    b3 += b;

                    index = i * 3;
                    data[index] = b1;
                    if (!pad2)
                        data[index + 1] = b2;
                    if (!pad1)
                        data[index + 2] = b3;
                }

                return data;
            }
            catch
            {
                return new byte[] { };
            }
        }

        public static string ToUnSign(string s, string[]? replaceChars, string replaceWith)
        {
            string[] pattern = {"(á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ)",
                   "đ",
                   "(é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ)",
                   "(í|ì|ỉ|ĩ|ị)",
                   "(ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ)",
                   "(ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự)",
                   "(ý|ỳ|ỷ|ỹ|ỵ)"};
            char[] replaceChar = { 'a', 'd', 'e', 'i', 'o', 'u', 'y', 'A', 'D', 'E', 'I', 'O', 'U', 'Y' };
            s = Validation.ToNewStandardString(s);
            for (int i = 0; i < pattern.Length; i++)
            {
                MatchCollection matchs = Regex.Matches(s, pattern[i], RegexOptions.IgnoreCase);
                foreach (Match m in matchs)
                {
                    char ch = char.IsLower(m.Value[0]) ? replaceChar[i] : replaceChar[i + 7];
                    s = s.Replace(m.Value[0], ch);
                }
            }
            if (replaceChars is { Length: > 0 })
            {
                foreach (var strReplace in replaceChars)
                {
                    s = Replace(s, strReplace, replaceWith);
                }
            }
            s = Replace(s, "__", replaceWith);
            s = TrimLeftString(s, replaceWith);
            s = TrimRightString(s, replaceWith);
            return s;
        }

        public static string ToUnSign(string s)
        {
            return ToUnSign(s, null);
        }

        public static string ToUnSign(string s, string[]? replaceChars)
        {
            return ToUnSign(s, replaceChars, "_");
        }

        public static Color ToColor(string colorHex)
        {

            colorHex = colorHex + "";
            if (colorHex.StartsWith("#"))
            {
                colorHex = colorHex.Replace("#", "");
                byte a = 0xff, r = 0, g = 0, b = 0;
                switch (colorHex.Length)
                {
                    case 3:
                        r = byte.Parse(colorHex.Substring(0, 1), System.Globalization.NumberStyles.HexNumber);
                        g = byte.Parse(colorHex.Substring(1, 1), System.Globalization.NumberStyles.HexNumber);
                        b = byte.Parse(colorHex.Substring(2, 1), System.Globalization.NumberStyles.HexNumber);
                        break;
                    case 4:
                        a = byte.Parse(colorHex.Substring(0, 1), System.Globalization.NumberStyles.HexNumber);
                        r = byte.Parse(colorHex.Substring(1, 1), System.Globalization.NumberStyles.HexNumber);
                        g = byte.Parse(colorHex.Substring(2, 1), System.Globalization.NumberStyles.HexNumber);
                        b = byte.Parse(colorHex.Substring(3, 1), System.Globalization.NumberStyles.HexNumber);
                        break;
                    case 6:
                        r = byte.Parse(colorHex.Substring(0, 2), System.Globalization.NumberStyles.HexNumber);
                        g = byte.Parse(colorHex.Substring(2, 2), System.Globalization.NumberStyles.HexNumber);
                        b = byte.Parse(colorHex.Substring(4, 2), System.Globalization.NumberStyles.HexNumber);
                        break;
                    case 8:
                        a = byte.Parse(colorHex.Substring(0, 2), System.Globalization.NumberStyles.HexNumber);
                        r = byte.Parse(colorHex.Substring(2, 2), System.Globalization.NumberStyles.HexNumber);
                        g = byte.Parse(colorHex.Substring(4, 2), System.Globalization.NumberStyles.HexNumber);
                        b = byte.Parse(colorHex.Substring(6, 2), System.Globalization.NumberStyles.HexNumber);
                        break;
                }
                return Color.FromArgb(a, r, g, b);
            }
            else
            {
                colorHex = colorHex.Replace(" ", "");
                string[] arrColor = colorHex.Split(',');
                if (arrColor.Length == 3)
                {
                    int r = Converter.ToInt(arrColor[0]);
                    int g = Converter.ToInt(arrColor[1]);
                    int b = Converter.ToInt(arrColor[2]);
                    return Color.FromArgb(r, g, b);
                }
                else
                    return Color.FromName(colorHex);
            }
        }

        #endregion

        #region Explode data to array
        public static List<int> ExplodeStringToIntList(string input, string split)
        {
            List<int> ret = new List<int>();
            try
            {
                if (string.IsNullOrEmpty(split)) split = ",";
                if (string.IsNullOrEmpty(input)) return ret;
                string[] values = System.Text.RegularExpressions.Regex.Split(input, split);
                if (values == null) return ret;
                for (int i = 0; i < values.Length; i++)
                {
                    ret.Add(Converter.ToInt(values[i]));
                }
            }
            catch
            {
            }
            return ret;
        }

        public static List<int> ExplodeStringToIntList(string input)
        {
            return ExplodeStringToIntList(input, ",");
        }

        public static List<float> ExplodeStringToFloatList(string input, string split)
        {
            List<float> ret = new List<float>();
            try
            {
                if (string.IsNullOrEmpty(split)) split = ",";
                if (string.IsNullOrEmpty(input)) return ret;
                string[] values = System.Text.RegularExpressions.Regex.Split(input, split);
                if (values == null) return ret;
                for (int i = 0; i < values.Length; i++)
                {
                    ret.Add(Converter.ToFloat(values[i]));
                }
            }
            catch
            {
            }
            return ret;
        }

        public static List<float> ExplodeStringToFloatList(string input)
        {
            return ExplodeStringToFloatList(input, ",");
        }

        public static List<double> ExplodeStringToDoubleList(string input, string split)
        {
            List<double> ret = new List<double>();
            try
            {
                if (string.IsNullOrEmpty(split)) split = ",";
                if (string.IsNullOrEmpty(input)) return ret;
                string[] values = System.Text.RegularExpressions.Regex.Split(input, split);
                if (values == null) return ret;
                for (int i = 0; i < values.Length; i++)
                {
                    ret.Add(Converter.ToDouble(values[i]));
                }
            }
            catch
            {
            }
            return ret;
        }

        public static List<double> ExplodeStringToDoubleList(string input)
        {
            return ExplodeStringToDoubleList(input, ",");
        }

        public static List<decimal> ExplodeStringToDecimalList(string input, string split)
        {
            List<decimal> ret = new List<decimal>();
            try
            {
                if (string.IsNullOrEmpty(split)) split = ",";
                if (string.IsNullOrEmpty(input)) return ret;
                string[] values = System.Text.RegularExpressions.Regex.Split(input, split);
                if (values == null) return ret;
                for (int i = 0; i < values.Length; i++)
                {
                    ret.Add(Converter.ToDecimal(values[i]));
                }

            }
            catch
            {
            }
            return ret;
        }

        public static List<decimal> ExplodeStringToDecimalList(string input)
        {
            return ExplodeStringToDecimalList(input, ",");
        }

        public static List<byte> ExplodeStringToByteList(string input, string split)
        {
            List<byte> ret = new List<byte>();
            try
            {
                if (string.IsNullOrEmpty(split)) split = ",";
                if (string.IsNullOrEmpty(input)) return ret;
                string[] values = System.Text.RegularExpressions.Regex.Split(input, split);
                if (values == null) return ret;
                for (int i = 0; i < values.Length; i++)
                {
                    ret.Add(Converter.ToByte(values[i]));
                }
            }
            catch
            {
            }
            return ret;
        }

        public static List<byte> ExplodeStringToByteList(string input)
        {
            return ExplodeStringToByteList(input, ",");
        }
        #endregion

        #region Format number to string

        public static string NumberToFormatString(object? input)
        {
            string strInput = input + string.Empty;
            if (string.IsNullOrEmpty(strInput)) return "";
            string preInput = "";
            string sufixInput = "";
            string strOutput = "";
            if (strInput.IndexOf('.') > 0)
            {
                strInput = strInput.Replace(".", ",");
                preInput = strInput.Substring(0, strInput.IndexOf(','));
                sufixInput = strInput.Substring(strInput.IndexOf(','));
                if (sufixInput.Length > 4) sufixInput = sufixInput.Substring(0, 4);
                strOutput = sufixInput;
            }
            else
                preInput = strInput;
            int count = 0;
            if (preInput.Length > 0)
            {
                for (int i = preInput.Length - 1; i >= 0; i--)
                {
                    count++;
                    strOutput = preInput[i] + strOutput;
                    if (count == 3 && i > 0)
                    {
                        count = 0;
                        strOutput = "." + strOutput;
                    }
                }
            }
            return strOutput;
        }
        public static string NumberToVNString(decimal number)
        {
            return NumberToVNString(number, true);
        }
        public static string NumberToVNString(decimal number, string? sufixCaption = null)
        {
            return NumberToVNString(number, false, sufixCaption: sufixCaption);
        }
        public static string NumberToVNString(double? number, bool isMoney, string? sufixCaption = null)
        {
            return NumberToVNString(ToDecimal(number != null ? number.Value : 0), isMoney, sufixCaption);
        }

        public static string NumberToVNString(decimal number, bool isMoney, string? sufixCaption = null)
        {
            string s = number.ToString("#");
            string[] so = new string[] { "không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín" };
            string[] hang = new string[] { "", "nghìn", "triệu", "tỷ" };
            int i, j, donvi, chuc, tram;
            string str = " ";
            bool booAm = false;
            decimal decS = 0;
            decS = Converter.ToDecimal(s);
            if (decS < 0)
            {
                decS = -decS;
                s = decS.ToString();
                booAm = true;
            }
            i = s.Length;
            if (i == 0)
                str = so[0] + str;
            else
            {
                j = 0;
                while (i > 0)
                {
                    donvi = Convert.ToInt32(s.Substring(i - 1, 1));
                    i--;
                    if (i > 0)
                        chuc = Convert.ToInt32(s.Substring(i - 1, 1));
                    else
                        chuc = -1;
                    i--;
                    if (i > 0)
                        tram = Convert.ToInt32(s.Substring(i - 1, 1));
                    else
                        tram = -1;
                    i--;
                    if ((donvi > 0) || (chuc > 0) || (tram > 0) || (j == 3))
                        str = hang[j] + str;
                    j++;
                    if (j > 3) j = 1;
                    if ((donvi == 1) && (chuc > 1))
                        str = "một " + str;
                    else
                    {
                        if ((donvi == 5) && (chuc > 0))
                            str = "lăm " + str;
                        else if (donvi > 0)
                            str = so[donvi] + " " + str;
                    }
                    if (chuc < 0)
                        break;
                    else
                    {
                        if ((chuc == 0) && (donvi > 0)) str = "lẻ " + str;
                        if (chuc == 1) str = "mười " + str;
                        if (chuc > 1) str = so[chuc] + " mươi " + str;
                    }
                    if (tram < 0) break;
                    else
                    {
                        if ((tram > 0) || (chuc > 0) || (donvi > 0)) str = so[tram] + " trăm " + str;
                    }
                    str = " " + str;
                }
            }
            str = str.Trim();
            if (booAm)
                str = "Âm " + str;
            else if (str.Length > 1)
                str = str.Substring(0, 1).ToUpper() + str.Substring(1);
            str = str.Trim();
            if (!string.IsNullOrEmpty(sufixCaption))
                str = str + " " + sufixCaption + "./.";
            else if (isMoney)
                str = str + " đồng./.";
            else
                str = str + " ./.";
            str = str.Replace("  ", " ");
            return str;
        }

        #endregion

        #region Trim/Fill string

        public static string? Trim(string? input)
        {
            return input?.Trim();
        }

        public static string TrimLeftString(object? input, string trimText)
        {
            string strInput = input + string.Empty;
            if (string.IsNullOrEmpty(strInput)) return strInput;
            if (strInput.StartsWith(trimText))
            {
                return strInput.Substring(trimText.Length);
            }
            return strInput;
        }

        public static string TrimRightString(object? input, string trimText)
        {
            string strInput = input + string.Empty;
            if (string.IsNullOrEmpty(strInput)) return strInput;
            if (strInput.EndsWith(trimText))
            {
                return strInput.Substring(0, strInput.Length - trimText.Length);
            }
            return strInput;
        }

        public static string FillString(object? objInput, int length)
        {
            return FillString(objInput, length, "0");
        }

        public static string FillString(object? objInput, int length, string fillText)
        {
            return FillString(objInput, length, fillText, false);
        }
        public static string FillString(object? objInput, int length, string fillText, bool fillRight)
        {
            string str = objInput + string.Empty;
            try
            {
                if (str == null) str = "";
                if (str.Length == length) return str;
                if (str.Length > length) return str.Substring(0, length);
                for (int i = str.Length; i < length; i++)
                {
                    if (fillRight)
                        str = str + fillText;
                    else
                        str = fillText + str;
                }
            }
            catch
            {
            }
            return str;
        }

        public static string FillString(int maxLength, string fillText)
        {
            string ret = string.Empty;
            ret = ret.PadRight(maxLength, Convert.ToChar(fillText));
            //for (int i = 0; i < maxLength; i++)
            //{
            //    ret += fillText;
            //}
            return ret;
        }

        public static string FillRightStringToLength(object? input, int maxLength, string fillText)
        {
            string str = input + string.Empty;
            try
            {
                if (str == null) str = "";
                if (maxLength <= 0) return str;
                if (str.Length == maxLength) return str;
                if (str.Length > maxLength)
                    return str.Substring(0, maxLength);
                for (int i = str.Length; i < maxLength; i++)
                {
                    str = str + fillText;
                }
            }
            catch
            {
            }
            return str;
        }

        public static string FillRightStringToLength(object? input, int maxLength)
        {
            return FillRightString(input, maxLength, "0");
        }

        public static string FillRightString(object? input, int count, string fillText)
        {
            string str = input + string.Empty;
            try
            {
                if (str == null) str = "";
                if (count <= 0) return str;
                for (int i = 0; i < count; i++)
                {
                    str = str + fillText;
                }
            }
            catch
            {
            }
            return str;
        }

        public static string FillRightString(object? input, int count)
        {
            return FillRightString(input, count, "0");
        }

        public static string FillLeftStringToLength(object? input, int maxLength, string fillText)
        {
            string str = input + string.Empty;
            try
            {
                if (str == null) str = "";
                if (str.Length == maxLength) return str;
                if (str.Length > maxLength) return str.Substring(0, maxLength);
                for (int i = str.Length; i < maxLength; i++)
                {
                    str = fillText + str;
                }
            }
            catch
            {
            }
            return str;
        }

        public static string FillLeftStringToLength(object? input, int maxLength)
        {
            return FillLeftStringToLength(input, maxLength, "0");
        }

        public static string FillLeftString(object? input, int count, string fillText)
        {
            string str = input + string.Empty;
            try
            {
                if (str == null) str = "";
                if (count <= 0) return str;
                for (int i = 0; i < count; i++)
                {
                    str = fillText + str;
                }
            }
            catch
            {
            }
            return str;
        }

        public static string FillLeftString(object? input, int count)
        {
            return FillLeftString(input, count, "0");
        }
        #endregion

        #region Convert Image<->Array bytes


        public static byte[]? ReadImageFile(string imagePath)
        {
            try
            {
                if (string.IsNullOrEmpty(imagePath)) return null;
                if (!File.Exists(imagePath))
                    return null;
                byte[]? imageData = null;
                FileInfo fileInfo = new FileInfo(imagePath);
                long imageFileLength = fileInfo.Length;
                FileStream fs = new FileStream(imagePath, FileMode.Open, FileAccess.Read);
                BinaryReader br = new BinaryReader(fs);
                imageData = br.ReadBytes((int)imageFileLength);
                return imageData;
            }
            catch
            {
                return null;
            }
        }
        #endregion

        #region Convert Hexa<->Binary<->Decimal
        /// <summary>
        /// Convert byte to hexa string.
        /// </summary>
        /// <param name="input">Byte to be converted.</param>
        /// <returns>String representation of the hexa.</returns>
        public static string ByteToHex(ICollection<byte> input)
        {
            var result = string.Empty;
            if (input != null && input.Count > 0)
            {
                var isFirst = true;
                foreach (var b in input)
                {
                    result += isFirst ? string.Empty : ",";
                    result += b.ToString("X2");
                    isFirst = false;
                }
            }
            return result;
        }

        #endregion

        //Hàm đảo ngược thứ tự kí tự trong xâu

        public static string ReverseString(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;
            char[] chars = input.ToCharArray();
            Array.Reverse(chars);
            return new string(chars);
        }
        public static byte[]? ReverseBytes(byte[]? input)
        {
            if (input == null)
                return input;
            Array.Reverse<byte>(input);
            return input;
        }
        //Hàm chuyển đổi tọa độ dạng độ phút giây ra thập phân
        public static decimal CoordinateToDecimal(int[] array)
        {
            decimal result = 0;
            result = array[0];
            result = result + (decimal)array[1] / 60;
            result = result + (decimal)array[2] / 3600;
            return result;
        }

        //Hàm chuyển đổi giá trị thập phân ra tọa độ dạng độ phút giây
        public static int[] DecimalToCoordinate(decimal d)
        {
            int[] arr = { 0, 0, 0 };
            decimal temp;
            temp = System.Math.Floor(d);
            arr[0] = Converter.ToInt(temp); //độ
            if ((d - temp) > 0)
            {
                d = (d - temp) * 60;
                temp = System.Math.Floor(d);
                arr[1] = Converter.ToInt(temp); //phút
                if ((d - temp) > 0)
                {
                    arr[2] = Converter.ToInt((d - temp) * 60); //giây
                }
            }

            return arr;
        }


        public static string ToVNDay(string enInput)
        {
            enInput = (enInput + string.Empty).ToUpper();
            if (enInput == "SUNDAY" || enInput == "SUN")
            {
                return "Chủ nhật";
            }
            else if (enInput == "MONDAY" || enInput == "MON")
            {
                return "Thứ 2";
            }
            else if (enInput == "TUESDAY" || enInput == "TUE")
            {
                return "Thứ 3";
            }
            else if (enInput == "WEDNESDAY" || enInput == "WED")
            {
                return "Thứ 4";
            }
            else if (enInput == "THURSDAY" || enInput == "THU")
            {
                return "Thứ 5";
            }
            else if (enInput == "FRIDAY" || enInput == "FRI")
            {
                return "Thứ 6";
            }
            else if (enInput == "SATURDAY" || enInput == "SAT")
            {
                return "Thứ 7";
            }
            else return "";
        }

        public static string ToVNDay(DateTime dt)
        {
            string enInput = dt.DayOfWeek.ToString();
            return ToVNDay(enInput);
        }
        public static DateTime ToDateTimeLocal(DateTime? dt)
        {
            if (dt == null)
                return DateTime.MinValue;
            return new DateTime(dt.Value.Year, dt.Value.Month, dt.Value.Day, dt.Value.Hour, dt.Value.Minute, dt.Value.Second, DateTimeKind.Utc);
        }
        public static string Replace(object? input, string strSearch, string strReplace)
        {
            string strInput = input + string.Empty;
            if (string.IsNullOrEmpty(strInput))
                return strInput;
            while (strInput.Contains(strSearch))
                strInput = strInput.Replace(strSearch, strReplace);
            return strInput;
        }

        public static string NormalizationSqlDBTypeValue(string input)
        {
            string correctString = "";
            switch (input.ToUpper())
            {
                case "BIGINT":
                    correctString = "BigInt";
                    break;
                case "BINARY":
                    correctString = "Binary";
                    break;
                case "BIT":
                    correctString = "Bit";
                    break;
                case "CHAR":
                    correctString = "Char";
                    break;
                case "DATETIME":
                    correctString = "DateTime";
                    break;
                case "DECIMAL":
                    correctString = "Decimal";
                    break;
                case "FLOAT":
                    correctString = "Float";
                    break;
                case "IMAGE":
                    correctString = "Image";
                    break;
                case "INT":
                    correctString = "Int";
                    break;
                case "MONEY":
                    correctString = "Money";
                    break;
                case "NCHAR":
                    correctString = "NChar";
                    break;
                case "NTEXT":
                    correctString = "NText";
                    break;
                case "NVARCHAR":
                    correctString = "NVarChar";
                    break;
                case "REAL":
                    correctString = "Real";
                    break;
                case "UNIQUEIDENTIFIER":
                    correctString = "UniqueIdentifier";
                    break;
                case "SMALLDATETIME":
                    correctString = "SmallDateTime";
                    break;
                case "SMALLINT":
                    correctString = "SmallInt";
                    break;
                case "SMALLMONEY":
                    correctString = "SmallMoney";
                    break;
                case "TEXT":
                    correctString = "Text";
                    break;
                case "TIMESTAMP":
                    correctString = "Timestamp";
                    break;
                case "TINYINT":
                    correctString = "TinyInt";
                    break;
                case "VARBINARY":
                    correctString = "VarBinary";
                    break;
                case "VARCHAR":
                    correctString = "VarChar";
                    break;
                case "VARIANT":
                    correctString = "Variant";
                    break;
                case "XML":
                    correctString = "Xml";
                    break;
                case "UDT":
                    correctString = "Udt";
                    break;
                case "STRUCTURED":
                    correctString = "Structured";
                    break;
                case "DATE":
                    correctString = "Date";
                    break;
                case "TIME":
                    correctString = "Time";
                    break;
                case "DATETIME2":
                    correctString = "DateTime2";
                    break;
                case "DATETIMEOFFSET":
                    correctString = "DateTimeOffset";
                    break;
                default:
                    correctString = "BigInt";
                    break;
            }
            return correctString;
        }

        public static string AntiSQLInjection(string input)
        {
            string regexForTypicalInj = @"/\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/ix";
            return Regex.Replace(input, regexForTypicalInj, "");
        }
        public static string AddDDMMYYSlash(object? date)
        {
            try
            {
                string str = date + "";
                if (str.Length == 8)
                    return str.Substring(0, 2) + "/" + str.Substring(2, 2) + "/" + str.Substring(4, 4);
                else if (str.Length == 6)
                    return str.Substring(0, 2) + "/" + str.Substring(2, 4);
                else
                    return str;
            }
            catch
            {
                return date + "";
            }
        }
        public static string DDMMYYToYYMMDD(object? date)
        {
            return DDMMYYToYYMMDD(date, false);
        }
        public static string DDMMYYToYYMMDD(object? date, bool isSlash)
        {
            string ret = "";
            if (string.IsNullOrEmpty(date + ""))
                return string.Empty;
            string[] parts = (date + "").Split('/');
            if (parts.Length == 1)
                return date + string.Empty;
            string year = "";
            string month = "";
            string day = "";
            if (parts.Length > 0)
            {
                day = parts[0];
                if (Converter.ToInt(day) < 10 && day.Length == 1)
                    day = "0" + day;
            }
            if (parts.Length > 1)
            {
                month = parts[1];
                if (Converter.ToInt(month) < 10 && month.Length == 1)
                    month = "0" + month;
            }

            if (parts.Length > 2)
            {
                year = parts[2];
            }
            if (year.Length == 2)
            {
                int minYear = DateTime.Now.Year - 80;
                string strMinYear = minYear.ToString().Substring(2, 2);
                if (Converter.ToInt(year) >= Converter.ToInt(strMinYear) && Converter.ToInt(year) <= 99)
                    year = (Converter.ToInt(DateTime.Now.Year.ToString().Substring(0, 2)) - 1) + year;
                else
                    year = (DateTime.Now.Year).ToString().Substring(0, 2) + year;
            }
            if (isSlash)
                ret = year + "/" + month + "/" + day;
            else
                ret = year + month + day;
            return ret;
        }
        public static string YYMMDDToDDMMYY(object? input)
        {
            string date = input + string.Empty;
            string ret = "";
            if (string.IsNullOrEmpty(date))
                return string.Empty;
            if ((input + "").StartsWith("0001"))
                return "";
            if (date.Length == 6)
            {
                if (!date.Contains("/"))
                    ret = date.Substring(4, 2) + "/" + date.Substring(0, 4);
                else
                {
                    string[] parts = date.Split('/');
                    string year = "";
                    string month = "";
                    string day = "";
                    if (parts.Length > 0)
                        year = parts[0];
                    if (parts.Length > 1)
                        month = parts[1];
                    if (parts.Length > 2)
                        day = parts[2];
                    ret = day + month + year;
                }
            }
            else if (date.Length == 8)
            {
                if (!date.Contains("/"))
                    ret = date.Substring(6, 2) + "/" + date.Substring(4, 2) + "/" + date.Substring(0, 4);
                else
                {
                    string[] parts = date.Split('/');
                    string year = "";
                    string month = "";
                    string day = "";
                    if (parts.Length > 0)
                        year = parts[0];
                    string yearStart2 = (DateTime.Now.Year - 60).ToString().Substring(2, 2);
                    string yearStart1 = (DateTime.Now.Year - 60).ToString().Substring(0, 2);
                    if (year.Length == 2)
                    {
                        if (ToInt(year) <= 99 && ToInt(year) > ToInt(yearStart2))
                            year = yearStart1 + year;
                        else
                            year = (ToInt(yearStart1) + 1).ToString() + year;
                    }
                    if (parts.Length > 1)
                        month = parts[1] + "/";
                    if (parts.Length > 2)
                        day = parts[2] + "/";
                    ret = day + month + year;
                }
            }
            else if (date.Length == 10)
            {
                if (!date.Contains("/"))
                    ret = date;
                else
                {
                    string[] parts = date.Split('/');
                    string year = "";
                    string month = "";
                    string day = "";
                    if (parts.Length > 0)
                        year = parts[0];
                    if (parts.Length > 1)
                        month = parts[1] + "/";
                    if (parts.Length > 2)
                        day = parts[2] + "/";
                    ret = day + month + year;
                }
            }
            else if (date.Length == 14)
            {
                if (!date.Contains("/"))
                    ret = date.Substring(6, 2) + "/" + date.Substring(4, 2) + "/" + date.Substring(0, 4) + " " + date.Substring(8, 2) + ":" + date.Substring(10, 2) + ":" + date.Substring(12, 2);
                else
                {
                    string[] parts = date.Split('/');
                    string year = "";
                    string month = "";
                    string day = "";
                    if (parts.Length > 0)
                        year = parts[0];
                    string yearStart2 = (DateTime.Now.Year - 60).ToString().Substring(2, 2);
                    string yearStart1 = (DateTime.Now.Year - 60).ToString().Substring(0, 2);
                    if (year.Length == 2)
                    {
                        if (ToInt(year) <= 99 && ToInt(year) > ToInt(yearStart2))
                            year = yearStart1 + year;
                        else
                            year = (ToInt(yearStart1) + 1).ToString() + year;
                    }
                    if (parts.Length > 1)
                        month = parts[1] + "/";
                    if (parts.Length > 2)
                        day = parts[2] + "/";
                    ret = day + month + year;
                }
            }
            return ret;
        }

        public static float DegreeToRadian(float angleInDegree)
        {
            try
            {
                float angleInRadian = Converter.ToFloat((angleInDegree * Math.PI) / 180);
                return angleInRadian;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return 0;
            }
        }

        public static double DegreeToRadian(double angleInDegree)
        {
            try
            {
                double angleInRadian = Converter.ToDouble((angleInDegree * Math.PI) / 180);
                return angleInRadian;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return 0;
            }
        }
        public static bool Compare2DayDDMMYY(object? from, object? to)
        {
            if (!string.IsNullOrEmpty(from + "") && !string.IsNullOrEmpty(to + ""))
                return (Converter.DDMMYYToYYMMDD(from + "")).CompareTo(Converter.DDMMYYToYYMMDD(to + "")) <= 0;
            else
                return true;
        }
        public static int Compare2DateTimeYYMMDD(object? date1, object? date2)
        {
            string d1 = date1 + string.Empty;
            string d2 = date2 + string.Empty;
            if (!string.IsNullOrEmpty(d1) && !string.IsNullOrEmpty(d2))
            {
                return d1.CompareTo(d2);
            }
            return 0;
        }

        public static int Compare2DateTimeYYMMDD(object? date1, object? date2, int offsetDays)
        {
            string d1 = date1 + string.Empty;
            string d2 = date2 + string.Empty;
            if (d1.Length != 8 || d2.Length != 8)
                return -1;
            int year1 = ToInt(d1.Substring(0, 4));
            int month1 = ToInt(d1.Substring(4, 2));
            int day1 = ToInt(d1.Substring(6, 2));

            int year2 = ToInt(d2.Substring(0, 4));
            int month2 = ToInt(d2.Substring(4, 2));
            int day2 = ToInt(d2.Substring(6, 2));

            DateTime dt1 = new DateTime(year1, month1, day1);
            DateTime dt2 = new DateTime(year2, month2, day2);

            dt2 = dt2.AddDays(offsetDays);
            d1 = dt1.ToString("yyyyMMdd");
            d2 = dt2.ToString("yyyyMMdd");

            if (!string.IsNullOrEmpty(d1) && !string.IsNullOrEmpty(d2))
            {
                return d1.CompareTo(d2);
            }
            return 0;
        }

        public static int Compare2DateTimeDDMMYY(object? date1, object? date2)
        {
            string d1 = date1 + string.Empty;
            string d2 = date2 + string.Empty;
            d1 = d1.Replace(" ", "");
            d2 = d2.Replace(" ", "");
            d1 = d1.Replace("//", "");
            d2 = d2.Replace("//", "");
            if (!string.IsNullOrEmpty(d1) && !string.IsNullOrEmpty(d2))
            {
                d1 = DDMMYYToYYMMDD(d1);
                d2 = DDMMYYToYYMMDD(d2);
                return d1.CompareTo(d2);
            }
            return 0;
        }

        public static string ValidSQL(object? input)
        {
            string str = input + "";
            str = str.Replace("'", "''");
            return str;
        }



        public static string ReplaceControlCharacters(object? input)
        {
            string str = input + "";
            str = Regex.Replace(str, @"[\u0000-\u001F]", string.Empty);
            return str;
        }
        public static string GetTextSize(long size)
        {
            string donViTinh = "KB";
            if (size > 1099511627776L)
            {
                donViTinh = "TB";
                size = size / 1099511627776L;
            }
            else if (size > 1073741824L)
            {
                donViTinh = "GB";
                size = size / 1073741824L;
            }
            else if (size > 1048576L)
            {
                donViTinh = "MB";
                size = size / 1048576L;
            }
            else
            {
                size = size / 1024L;
            }
            return size.ToString("n2") + donViTinh;
        }
        public static string SplitCharsAndNums(string text)
        {
            var sb = new StringBuilder();
            text = text + string.Empty;
            for (int i = 0; i < text.Length - 1; i++)
            {
                if ((char.IsLetter(text[i]) && char.IsDigit(text[i + 1])) ||
                    (char.IsDigit(text[i]) && char.IsLetter(text[i + 1])))
                {
                    sb.Append(text[i]);
                    sb.Append(" ");
                }
                else
                    sb.Append(text[i]);
            }
            if (text.Length > 0)
                sb.Append(text[text.Length - 1]);
            return sb.ToString();
        }
        public static string RemoveSpecialCharacters(string str)
        {
            try
            {
                str = Regex.Replace(str, "[^a-zA-Z0-9 ._]+", string.Empty);
            }
            catch
            {
            }
            return str;
        }
        public static string ToFulltextSearch(string text)
        {
            try
            {
                text = text.Trim();
                text = Regex.Replace(text, "[ ]{2,}", " ");
                string[] arrText = text.Split(' ');
                StringBuilder sb = new StringBuilder();
                foreach (string item in arrText)
                {
                    text = Regex.Replace(item, @"\W", "");
                    string newText = SplitCharsAndNums(text);
                    if (newText.Length != text.Length)
                    {
                        //sb.Append(text);
                        //sb.Append(" ");
                        sb.Append(newText);
                        sb.Append(" ");
                    }
                    else
                    {
                        sb.Append(text);
                        sb.Append(" ");
                    }
                }
                text = sb.ToString();
                text = TrimRightString(text, " ");
            }
            catch
            {
            }
            return text;
        }
        public static object? FormatVNNumber(object? number)
        {
            return FormatVNNumber(number, "");
        }
        public static object? FormatVNNumber(object? number, string formatString)
        {
            try
            {
                if (number == null || number == DBNull.Value)
                    return "";
                Type type = number.GetType();
                string ret = "";
                if (type == typeof(Decimal) || type == typeof(decimal))
                {
                    decimal num = Converter.ToDecimal(number);
                    ret = num.ToString(formatString);
                }
                else if (type == typeof(float) || type == typeof(Single))
                {
                    float num = Converter.ToFloat(number);
                    ret = num.ToString(formatString);
                }
                else if (type == typeof(int) || type == typeof(Int64) || type == typeof(Int16) || type == typeof(Int32))
                {
                    int num = Converter.ToInt(number);
                    ret = num.ToString(formatString);
                }
                else if (type == typeof(double) || type == typeof(Double))
                {
                    double num = Converter.ToDouble(number);
                    ret = num.ToString(formatString);
                }
                else if (type == typeof(long))
                {
                    long num = Converter.ToLong(number);
                    ret = num.ToString(formatString);
                }
                else
                    return number;
                string[] parts = ret.Split('.');
                string firtPart = "";
                string lastPart = "";
                if (parts.Length == 2)
                {
                    firtPart = parts[0];
                    lastPart = parts[1];
                }
                else
                    firtPart = ret;
                if (!string.IsNullOrEmpty(lastPart))
                {
                    string zero = "0".PadLeft(lastPart.Length, '0');
                    if (lastPart == zero)
                        lastPart = "";
                    else
                    {
                        lastPart = Converter.ToDouble("0." + lastPart).ToString();
                        lastPart = lastPart.Substring(2);
                    }

                }
                firtPart = firtPart.Replace(",", ".");
                if (!string.IsNullOrEmpty(lastPart))
                    firtPart += "," + lastPart;
                return firtPart;
            }
            catch
            {

            }
            return number;
        }

        public static string FormatNumber(double? number, int? numDecimal = null)
        {
            if (number == 0 || number == null)
                return string.Empty;
            var lastDecimal = numDecimal != null ? "0".PadLeft(numDecimal.Value, '0') : "";
            var str = number?.ToString($"n{numDecimal}", System.Globalization.CultureInfo.GetCultureInfo("de-DE")) + "";
            // if(str.EndsWith("," + lastDecimal) || str.EndsWith(",000"))
            // {
            //     str = str.Substring(0, str.LastIndexOf(",", StringComparison.Ordinal));
            // }

            if (str.Contains(","))
            {
                while (str.EndsWith("0"))
                {
                    str = TrimRightString(str, "0");
                }
                if (str.EndsWith(","))
                    str = TrimRightString(str, ",");
            }
            return str;
        }

        public static DateTime? IntToDate(int? value)
        {
            if (value == null) return null;
            var str = value.Value.ToString();

            if (str.Length != 8) return null;

            if (DateTime.TryParseExact(str, "yyyyMMdd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var date))
            {
                return date;
            }
            return null;
        }
        public static int? DateToInt(DateTime? date)
        {
            if (date == null) return null;
            return int.Parse(date.Value.ToString("yyyyMMdd"));
        }
        //public static string FormatNumber(double? number, int numDecimal = 0)
        //{
        //    return string.Format(System.Globalization.CultureInfo.GetCultureInfo("de-DE"), "{0:000,000" + (numDecimal > 0 ? "." + "0".PadLeft(numDecimal, '0') : "") + "}", number);
        //}

        public static string GetFirstImage(string hostUrl, string textAlter1, string textAlter2, string title, string imgWidth, string style)
        {
            return GetFirstImage(hostUrl, textAlter1, textAlter2, title, imgWidth, "", style);
        }

        public static string GetFirstImage(string hostUrl, string textAlter1, string textAlter2, string title, string imgWidth, string imgHeight, string style)
        {
            string src = "";
            Match match = Regex.Match(textAlter1, "<img.+?src=[\"'](.+?)[\"'].+?>", RegexOptions.IgnoreCase);
            if (match.Groups.Count > 1)
                src = match.Groups[1].Value;
            match = Regex.Match(textAlter2, "<img.+?src=[\"'](.+?)[\"'].+?>", RegexOptions.IgnoreCase);
            if (match.Groups.Count > 1)
                src = match.Groups[1].Value;
            string attributes = "";
            if (!string.IsNullOrEmpty(imgWidth))
                attributes += " width=\"" + imgWidth + "\" ";
            if (!string.IsNullOrEmpty(imgHeight))
                attributes += " height=\"" + imgHeight + "\" ";
            if (!string.IsNullOrEmpty(src))
            {
                
                if (src.StartsWith("http://") || src.StartsWith("https://"))
                {
                    return Backend.Converter.UrlHelper.CreateImageLinkFromUrl(title, src, imgWidth, imgHeight, attributes, style);
                }
                else
                {
                    if (src.StartsWith("/"))
                        src = src.Substring(1);
                    return Backend.Converter.UrlHelper.CreateImageLink(title, src, imgWidth, imgHeight, attributes, style);
                }
            }
            else
            { 
                return "";
            }
        }
        
        public static string? GetFirstWordsFromHtmlText(string? html, int count = 0)
        {
            if (string.IsNullOrEmpty(html) )
                return html;
            
            string textOnly = Regex.Replace(html, "<.*?>", string.Empty);
            if (count == 0)
                return textOnly;
            var words = textOnly.Replace("  ", " ").Split(' ');
            if (words.Length <= count)
                return textOnly;
            return string.Join(" ", words.Take(count)) + "...";
        }
        
        public static string RemoveHtmlTags(string? input)
        {
            if (string.IsNullOrEmpty(input)) return input; 
            string result = Regex.Replace(input, "<.*?>", string.Empty);
 
            result = Regex.Replace(result, "&nbsp;", " ", RegexOptions.IgnoreCase);

            return result.Trim();
        }



        
    }
}