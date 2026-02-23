using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Drawing;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Backend.Converter
{
    public enum PasswordScore
    { 
        [Description("Rỗng")]
        Blank = 0,
        [Description("Rất yếu")]
        VeryWeak = 1,
        [Description("Yếu")]
        Weak = 2,
        [Description("Trung bình")]
        Medium = 3,
        [Description("Mạnh")]
        Strong = 4,
        [Description("Rất mạnh")]
        VeryStrong = 5,
        [Description("Hai mật khẩu không khớp")]
        NoMatch = 6
    }
    public static class Validation
    {
        public static string RegEmail = @"\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*";
        public static string RegSpecialCharacters = @"%!@#$%^&*()?/><,:;'\|}]{[~`+=-" + "\"";
        public static string RegNormalCharacters = "[^A-Za-z0-9_.]";
        public static bool IsValidEmail(string input)
        {
            try
            {
                System.Text.RegularExpressions.Regex regex = new System.Text.RegularExpressions.Regex(RegEmail);
                return regex.IsMatch(input);
            }
            catch(Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }
        public static bool IsValidUserName(string? input)
        {
            try
            {
                System.Text.RegularExpressions.Regex regex = new System.Text.RegularExpressions.Regex(@"^[a-zA-Z][a-zA-Z0-9._-]{0,50}?[a-zA-Z0-9]{0,2}$");
                return regex.IsMatch(input + "");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        public static PasswordScore CheckStrongPassword(string? password)
        {
            int score = 0;
            string text = password + "";
            if (string.IsNullOrEmpty(text))
                return PasswordScore.Blank;
            if (text.Length < 4)
                return PasswordScore.VeryWeak;
            if (text.Length >= 8)
                score++;
            if (text.Any(char.IsLower))
                score++;
            if (text.Any(char.IsDigit))
                score++;
            if (text.Any(char.IsUpper))
                score++;
            if (text.IndexOfAny("!@#$%^&*()_-?~.,".ToArray()) != -1)
                score++;
            return (PasswordScore)score;
        }
        public static bool CheckSameTime(object dateFrom1, object dateTo1, object dateFrom2, object dateTo2)
        {
            string lastNgayVangMatTu = dateFrom2 + string.Empty;
            string lastNgayVangMatDen = dateTo2 + string.Empty;
            string ngayVangMatTu = dateFrom1 + string.Empty;
            string ngayVangMatDen = dateTo1 + string.Empty;

            if (!string.IsNullOrEmpty(lastNgayVangMatTu))
            {
                if (!string.IsNullOrEmpty(ngayVangMatDen))
                {
                    if (ngayVangMatDen.CompareTo(lastNgayVangMatTu) >= 0 && string.IsNullOrEmpty(lastNgayVangMatDen))
                    {
                        return true;
                    }
                    if (ngayVangMatDen.CompareTo(lastNgayVangMatTu) >= 0 && !string.IsNullOrEmpty(lastNgayVangMatDen) && ngayVangMatTu.CompareTo(lastNgayVangMatDen) <= 0)
                    {
                        return true;
                    }
                }
                else if (ngayVangMatTu.CompareTo(lastNgayVangMatTu) <= 0)
                {
                    return true;
                }
                else if (ngayVangMatTu.CompareTo(lastNgayVangMatTu) >= 0)
                {
                    if (!string.IsNullOrEmpty(lastNgayVangMatDen) && ngayVangMatTu.CompareTo(lastNgayVangMatDen) <= 0 || string.IsNullOrEmpty(lastNgayVangMatDen))
                    {
                        return true;
                    }
                }
            }
            return false;
        }
        public static bool HasSpecialCharacters(object str)
        {
            char[] specialCharactersArray = RegSpecialCharacters.ToCharArray();

            int index = (str + string.Empty).IndexOfAny(specialCharactersArray);
            //index == -1 no special characters
            if (index == -1)
                return false;
            else
                return true;
        }

        public static bool CheckContainSpecialCharacters(object input)
        {
            if (string.IsNullOrEmpty(input + string.Empty))
                return true;

            Regex rgxUrl = new Regex(RegNormalCharacters);
            bool fieldNameNotContainsSpecialCharacters = rgxUrl.IsMatch(input + string.Empty);
            return fieldNameNotContainsSpecialCharacters;
        }

        public static bool CheckContainSpaceCharacters(object input)
        {
            if (string.IsNullOrEmpty(input + string.Empty))
                return true;

            Regex rgxUrl = new Regex(RegNormalCharacters);
            bool fieldNameNotContainsSpecialCharacters = rgxUrl.IsMatch(input + string.Empty);
            return (input + string.Empty).IndexOf(" ") >= 0;
        }

        public static bool IsStartWithCharacter(object input)
        {
            if (string.IsNullOrEmpty(input + string.Empty))
                return false;
            string firstChar = (input + string.Empty).Substring(0, 1);
            if (firstChar == "0" ||
                firstChar == "1" ||
                firstChar == "2" ||
                firstChar == "3" ||
                firstChar == "4" ||
                firstChar == "5" ||
                firstChar == "6" ||
                firstChar == "7" ||
                firstChar == "8" ||
                firstChar == "9")
            {
                return false;
            }
            return true;
        }

        public static bool IsSignedString(string s)
        {
            return IsSignedString(s, null);
        }

        public static bool IsSignedString(string s, string[]? replaceChars)
        {
            string[] pattern = {"(á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ)",
                   "đ",
                   "(é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ)",
                   "(í|ì|ỉ|ĩ|ị)",
                   "(ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ)",
                   "(ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự)",
                   "(ý|ỳ|ỷ|ỹ|ỵ)"};
            for (int i = 0; i < pattern.Length; i++)
            {
                MatchCollection matchs = Regex.Matches(s, pattern[i], RegexOptions.IgnoreCase);
                if (matchs != null && matchs.Count > 0)
                    return true;
            }
            if (replaceChars != null && replaceChars.Length > 0)
            {
                foreach (var strReplace in replaceChars)
                {
                    if (s.Contains(strReplace))
                        return true;
                }
            }
            return false;
        }

        public static bool IsValidateDateStartAndEnd(string startDate, string endDate)
        {
            if (string.IsNullOrEmpty(startDate) || string.IsNullOrEmpty(endDate))
            {
                return false;
            }
            if (startDate.Length != 10 || endDate.Length != 10)
            {
                return false;
            }
            if (Converter.ToInt(startDate.Substring(5, 4) + startDate.Substring(2, 2) + startDate.Substring(0, 2)) >= Converter.ToInt(endDate.Substring(5, 4) + endDate.Substring(2, 2) + endDate.Substring(0, 2)))
            {
                return false;
            }
            return true;
        }

        /// <summary>
        /// Fixing a string, it is compatible with SQL-92 standard.
        /// </summary>
        /// <param name="strInput"></param>
        /// <returns>String</returns>
        public static string FixSql(string strInput)
        {
            try
            {
                strInput = strInput.Trim();
                strInput = strInput.Replace("'", "''");
                return strInput;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return strInput;
            }
        }

        /// <summary>
        /// Checking a string, is it empty?
        /// </summary>
        /// <param name="strInput"></param>
        /// <returns>String</returns>
        public static bool IsEmpty(string strInput)
        {
            try
            {
                strInput = strInput.Trim();
                return (strInput == "");
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }

        /// <summary>
        /// Checking a string, is it a date-time value?
        /// </summary>
        /// <param name="strInput"></param>
        /// <returns>Bool</returns>
        public static bool IsDateTime(string strInput)
        {
            try
            {
                DateTime dt = Convert.ToDateTime(strInput);
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        /// <summary>
        /// Checking a string, is it a number value?
        /// </summary>
        /// <param name="strInput"></param>
        /// <returns>Bool</returns>
        public static bool IsNumber(object obj)
        {
            try
            {
                if (obj == null) return false;
                else if (obj is sbyte) return true;
                else if (obj is byte) return true;
                else if (obj is short) return true;
                else if (obj is ushort) return true;
                else if (obj is int) return true;
                else if (obj is uint) return true;
                else if (obj is long) return true;
                else if (obj is ulong) return true;
                else if (obj is float) return true;
                else if (obj is double) return true;
                else if (obj is decimal) return true;
                string? s = Convert.ToString(obj, System.Globalization.CultureInfo.InvariantCulture);
                double output = 0;
                return double.TryParse(s + string.Empty, NumberStyles.Any, NumberFormatInfo.InvariantInfo, out output);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        /// <summary>
        /// Checking a string, is it a double value?
        /// </summary>
        /// <param name="strInput"></param>
        /// <returns>Bool</returns>
        public static bool IsDouble(string strInput)
        {
            try
            {
                double Dummy = 0;
                return double.TryParse(strInput, System.Globalization.NumberStyles.Any, null, out Dummy);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return false;
            }
        }

        /// <summary>
        /// Checking a string, is it a int value?
        /// </summary>
        /// <param name="strInput"></param>
        /// <returns>Bool</returns>
        public static bool IsInt(string strInput)
        {
            try
            {
                int Dummy = 0;
                return int.TryParse(strInput, System.Globalization.NumberStyles.Any, null, out Dummy);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        public static bool Equals(Color clr1, Color clr2)
        {
            try
            {
                return (clr1.R == clr2.R) && (clr1.G == clr2.G) && (clr1.B == clr2.B);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return false;
            }
        }

        public static string ToOracleDateString(DateTime date)
        {
            try
            {
                string date_str = "to_date('" + date.Month + "/" + date.Day + "/" + date.Year + "','mm/dd/yyyy')";
                return date_str;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return "";
            }
        }

        public static string ToOracleDateTimeString(DateTime date)
        {
            try
            {
                string date_str = "to_date('" + date.Month + "/" + date.Day + "/" + date.Year + " "
                    + date.Hour + ":" + date.Minute + ":" + date.Second + "','mm/dd/yyyy hh24:mi:ss')";
                return date_str;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return "";
            }
        }

        public static string ToMSDateString(DateTime date)
        {
            try
            {
                string date_str = date.Month + "/" + date.Day + "/" + date.Year;
                return date_str;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return "";
            }
        }

        public static string ToMSDateTimeString(DateTime date)
        {
            try
            {
                string date_str = date.Month + "/" + date.Day + "/" + date.Year + " "
                    + date.Hour + ":" + date.Minute + ":" + date.Second;
                return date_str;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return "";
            }
        }

        public static string ToNewStandardString(string input)
        {
            input = input + "";
            while (input.Contains("  "))
                input = input.Replace("  ", " ");
            while (input.Contains("\t"))
                input = input.Replace("\t", " ");
            input = input.Trim();
            string[] patternDungSan = { "á", "à", "ả", "ã", "ạ", "ắ", "ằ", "ẳ", "ẵ", "ặ", "ấ", "ầ", "ẩ", "ẫ", "ậ",
                "é", "è", "ẻ", "ẽ", "ẹ", "ế", "ề", "ể", "ễ", "ệ",
                "í", "ì", "ỉ", "ĩ", "ị",
                "ó", "ò", "ỏ", "õ", "ọ", "ố", "ồ", "ổ", "ỗ", "ộ", "ớ", "ờ", "ở", "ỡ", "ợ",
                "ú", "ù", "ủ", "ũ", "ụ", "ứ", "ừ", "ử", "ữ", "ự",
                "ý", "ỳ", "ỷ", "ỹ", "ỵ" };
            string[] patternToHop = {"á", "à", "ả", "ã", "ạ", "ắ", "ằ", "ẳ", "ẵ", "ặ", "ấ", "ầ", "ẩ", "ẫ", "ậ",
                   "é", "è", "ẻ", "ẽ", "ẹ",  "ế", "ề", "ể", "ễ", "ệ",
                   "í", "ì", "ỉ", "ĩ", "ị",
                   "ó", "ò", "ỏ", "õ", "ọ", "ố", "ồ", "ổ", "ỗ", "ộ", "ớ", "ờ", "ở", "ỡ", "ợ",
                   "ú", "ù", "ủ", "ũ", "ụ", "ứ", "ừ", "ử", "ữ", "ự",
                   "ý", "ỳ", "ỷ", "ỹ", "ỵ"};
            for (int i = 0; i < patternToHop.Length; i++)
            {
                string strToHop = patternToHop[i];
                string strDungSan = patternDungSan[i];
                input = input.Replace(strToHop, strDungSan);
            }

            input = input.Replace("\t", "");
            return input;
        }
        public static string ToStandardString(string input)
        {
            try
            {
                input = ToNewStandardString(input).Trim();
                input = input.ToLower();
                input = input.Trim();
                string[] words = Regex.Split(input, " ");
                input = "";
                foreach (string word in words)
                {
                    input += string.Format("{0}{1} ", word.Length > 0 ? word.Substring(0, 1).ToUpper() : "", (word.Length > 1 ? word.Substring(1) : ""));
                }
                return input.Trim();
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return "";
            }
        }
    }
}