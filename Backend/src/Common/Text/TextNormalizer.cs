namespace Backend.Common.Text;

public static class TextNormalizer
{
    public static string RemoveVietnameseTones(string str)
    {
        string[] vietnameseSigns =
        [
            "aAeEoOuUiIdDyY",
            "áàạảãâấầậẩẫăắằặẳẵ",
            "ÁÀẠẢÃÂẤẦẬẨẪĂẮẰẶẲẴ",
            "éèẹẻẽêếềệểễ",
            "ÉÈẸẺẼÊẾỀỆỂỄ",
            "óòọỏõôốồộổỗơớờợởỡ",
            "ÓÒỌỎÕÔỐỒỘỔỖƠỚỜỢỞỠ",
            "úùụủũưứừựửữ",
            "ÚÙỤỦŨƯỨỪỰỬỮ",
            "íìịỉĩ",
            "ÍÌỊỈĨ",
            "đ",
            "Đ",
            "ýỳỵỷỹ",
            "ÝỲỴỶỸ"
        ];

        for (int i = 1; i < vietnameseSigns.Length; i++)
        {
            for (int j = 0; j < vietnameseSigns[i].Length; j++)
                str = str.Replace(vietnameseSigns[i][j], vietnameseSigns[0][i - 1]);
        }

        return str.ToLower();
    }
}
