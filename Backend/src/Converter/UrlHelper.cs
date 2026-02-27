using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web;

namespace Backend.Converter
{
    public static class UrlHelper
    { 
        public static string CreateImageLinkFromUrl(
            string title, string url, string width, string height, string htmlAttribs, string style)
        {
            return $"<img src=\"{url}\" title=\"{title}\" width=\"{width}\" height=\"{height}\" {htmlAttribs} style=\"{style}\" />";
        }

        public static string CreateImageLink(
            string title, string fileName, object width, object height, string htmlAttribs, string style)
        {
            return $"<img src=\"{fileName}\" title=\"{title}\" width=\"{width}\" height=\"{height}\" {htmlAttribs} style=\"{style}\" />";
        }

        public static string CreateImageVideoLink(string title, string fileName, object width, object height, string htmlAttribs)
        {
            string html = "";
            html = "<img src=\"" + "anh-video/" + fileName.Replace(":", "").Replace("?", "").Replace("&", "").Replace("=", "").Replace("/", ".,;") + "\" title=\"" + title + "\" " + htmlAttribs + " />";
            return html;
        } 
    }
}
