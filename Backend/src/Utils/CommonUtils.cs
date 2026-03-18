using System.Diagnostics;
using protos;
using Google.Protobuf;
using Grpc.Core;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;
using MongoDB.Driver;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Security.Claims;
using System.Text;

using Google.Protobuf.WellKnownTypes;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson.Serialization;


namespace Backend.Utils;

    public static class CommonUtils
    {
        public static Timestamp GetNowTimestamp()
        {
            return Timestamp.FromDateTime(DateTime.UtcNow);
        }

        /// <summary>
        /// Converts a BsonValue (BsonDateTime or {Seconds, Nanos} subdocument) to a Protobuf Timestamp.
        /// </summary>
        public static Timestamp? BsonToTs(BsonValue? value)
        {
            if (value == null || value.IsBsonNull) return null;
            if (value.IsBsonDateTime) return Timestamp.FromDateTime(value.ToUniversalTime());
            if (value.IsBsonDocument)
            {
                var doc = value.AsBsonDocument;
                return new Timestamp
                {
                    Seconds = doc.GetValue("Seconds", 0L).ToInt64(),
                    Nanos = doc.GetValue("Nanos", 0).ToInt32()
                };
            }
            return null;
        }

        /// <summary>
        /// Converts a Protobuf Timestamp to a BsonDocument {Seconds, Nanos} for MongoDB storage.
        /// </summary>
        public static BsonValue TsToBson(Timestamp? ts)
        {
            if (ts == null) return BsonNull.Value;
            return new BsonDocument { { "Seconds", ts.Seconds }, { "Nanos", ts.Nanos } };
        }

        /// <summary>Shared soft-delete filter: exclude docs where Delete == true.</summary>
        public static readonly FilterDefinition<BsonDocument> NotDeleted =
            Builders<BsonDocument>.Filter.Ne("Delete", true);

        /// <summary>Delete multiple BsonDocuments by _id. Supports single + batch ids.</summary>
        public static async Task<long> DeleteByIdsAsync(
            IMongoCollection<BsonDocument> collection,
            string? singleId,
            IEnumerable<string> multipleIds)
        {
            var ids = new List<string>();
            if (!string.IsNullOrWhiteSpace(singleId)) ids.Add(singleId);
            ids.AddRange(multipleIds.Where(id => !string.IsNullOrWhiteSpace(id)));
            if (ids.Count == 0) return 0;
            return (await collection.DeleteManyAsync(
                Builders<BsonDocument>.Filter.In("_id", ids))).DeletedCount;
        }

        /// <summary>Delete multiple BsonDocuments by _id (batch-only overload).</summary>
        public static Task<long> DeleteByIdsAsync(
            IMongoCollection<BsonDocument> collection,
            IEnumerable<string> ids) => DeleteByIdsAsync(collection, null, ids);

        public static string? GetIP(HttpContext context)
        {
            return context.Connection?.RemoteIpAddress?.ToString();
        }

        public static ByteString GetDataFromCollection(IMessage message)
        {
            var memoryUser = new MemoryStream();
            CodedOutputStream codedOutputStreamUser = new CodedOutputStream(memoryUser);
            message.WriteTo(codedOutputStreamUser);
            codedOutputStreamUser.Flush();
            memoryUser.Position = 0;
            return ByteString.FromStream(memoryUser);
        }

        // public static ClaimsPrincipal? GetPrincipalFromExpiredToken(string? token, IConfiguration config)
        // {
        //     var tokenValidationParamters = new TokenValidationParameters
        //     {
        //         ValidateAudience = false,
        //         ValidateIssuer = false,
        //         ValidateIssuerSigningKey = false,
        //         //IssuerSigningKey = JwtValidationHelper.GetRSASecurityKey(config["Jwt:Key"] + string.Empty),
        //         IssuerSigningKey = JwtValidationHelper.GetPublicSymmetricKey(config["Jwt:Key"] + ""),
        //         ValidateLifetime = false
        //     };
        //     var tokenHandler = new JwtSecurityTokenHandler();
        //     var principal = tokenHandler.ValidateToken(token, tokenValidationParamters, out var securityToken);
        //     var jwtSecurityToken = securityToken as JwtSecurityToken;
        //     if (jwtSecurityToken == null || jwtSecurityToken.Header.Alg != SecurityAlgorithms.HmacSha256)
        //         return null;
        //     return principal;
        // }

        // public static async Task<string?> GetAccessTokenFromSSOKeycloakAsync(HttpClient client)
        // {
        //     try
        //     {
        //         if (Global.ThamSoHeThong == null)
        //             return string.Empty;
        //         var postData = new Dictionary<string, string>();
        //         postData.Add("client_id", "admin-cli");
        //         postData.Add("grant_type", "password");
        //         postData.Add("username", Global.ThamSoHeThong.TaiKhoanDangNhapMotLan + "");
        //         postData.Add("password", Global.ThamSoHeThong.MatKhauDangNhapMotLan + "");
        //         using var content = new FormUrlEncodedContent(postData);
        //         client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/x-www-form-urlencoded"));
        //         var ssoResponse = await client.PostAsync(
        //             $"{(Global.ThamSoHeThong.MayChuDangNhapMotLan.EndsWith("/") ? Global.ThamSoHeThong.MayChuDangNhapMotLan : Global.ThamSoHeThong.MayChuDangNhapMotLan + "/")}realms/master/protocol/openid-connect/token",
        //             content);
        //         var value = await ssoResponse.Content.ReadAsStringAsync();
        //         var token = Newtonsoft.Json.JsonConvert.DeserializeObject<SSOTokenReponse>(value);
        //         if (token != null)
        //             return token.access_token;
        //     }
        //     catch (Exception e)
        //     {
        //         Console.WriteLine(e.Message);
        //     }
        //     return string.Empty;
        // }

        // public static void OnUserIDChanged(string oldId, string newId)
        // {
        //     //Update NguoiDungNhomNguoiDung
        //     Global.CollectionNguoiDungNhomNguoiDung!.UpdateMany(Builders<NguoiDungNhomNguoiDung>.Filter.Eq(c => c.IDNguoiDung, oldId),
        //         Builders<NguoiDungNhomNguoiDung>.Update.Set(c => c.IDNguoiDung, newId));
        //     //Update PhanQuyenNguoiDung
        //     Global.CollectionPhanQuyenNguoiDung!.UpdateMany(Builders<PhanQuyenNguoiDung>.Filter.Eq(c => c.IDNguoiDung, oldId),
        //         Builders<PhanQuyenNguoiDung>.Update.Set(c => c.IDNguoiDung, newId));
        //     //Update PhanQuyenNguoiDungNganhDoc
        //     Global.CollectionPhanQuyenNguoiDungNganhDoc!.UpdateMany(Builders<PhanQuyenNguoiDungNganhDoc>.Filter.Eq(c => c.IDNguoiDung, oldId),
        //         Builders<PhanQuyenNguoiDungNganhDoc>.Update.Set(c => c.IDNguoiDung, newId));
        //     //Update PhanQuyenPhanHeNguoiDung
        //     Global.CollectionPhanQuyenPhanHeNguoiDung!.UpdateMany(Builders<PhanQuyenPhanHeNguoiDung>.Filter.Eq(c => c.IDNguoiDung, oldId),
        //         Builders<PhanQuyenPhanHeNguoiDung>.Update.Set(c => c.IDNguoiDung, newId));
        //     //Update UserParams
        //     Global.CollectionUserParams!.UpdateMany(Builders<ThamSoNguoiDung>.Filter.Eq(c => c.IDNguoiDung, oldId),
        //         Builders<ThamSoNguoiDung>.Update.Set(c => c.IDNguoiDung, newId));
        // }

        // public static async Task DoChangePermissionUser(IHubContext<SignalRHub> _hubContext, string toUserId)
        // {
        //     if (!string.IsNullOrEmpty(toUserId))
        //     {
        //         var connections = SignalRHub.Connections.GetConnections(toUserId).ToArray();
        //         if (connections.Any())
        //             await _hubContext.Clients.Clients(connections.Select(c => c.ConnectionID)!)
        //                 .SendAsync("ReceiveBroadcastCommandExec",
        //                     new CommandMessage() { Type = CommandType.PermissionChanged, FromUserName = "SYSTEM" });
        //     }
        // }
        // public static async Task<bool> UpdateUserPermission(IEnumerable<string> groupIds, IEnumerable<string> userIds,IHubContext<SignalRHub> _hubContext, ServerCallContext? context)
        // {
        //     try
        //     {
        //         var listPhanQuyenNhomNguoiDungBson = Global.CollectionPhanQuyenNhomNguoiDungBson
        //             .Find(Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", groupIds)).ToList();
        //         var listPhanQuyenNhomNguoiDung = listPhanQuyenNhomNguoiDungBson.Select(c =>
        //         {
        //             var userGroupPermission = BsonSerializer.Deserialize<PhanQuyenNhomNguoiDung>(c);
        //             if (c.Contains("Actions"))
        //             {
        //                 foreach (var item in c["Actions"].AsBsonDocument.Elements)
        //                 {
        //                     userGroupPermission.Actions.Add(item.Name, item.Value.AsBoolean);
        //                 }
        //             }
        //             return userGroupPermission;
        //         });
        //         var listPhanHeNhomNguoiDung =
        //             Global.CollectionPhanQuyenPhanHeNhomNguoiDung.Find(
        //                 Builders<PhanQuyenPhanHeNhomNguoiDung>.Filter.In(x => x.IDNhomNguoiDung, groupIds)).ToList();
        //         var listPhanQuyenNhomNguoiDungNganhDocBson =
        //             Global.CollectionPhanQuyenNhomNguoiDungNganhDocBson.Find(
        //                 Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", groupIds)).ToList();
        //         var listPhanQuyenNhomNguoiDungNganhDoc = listPhanQuyenNhomNguoiDungNganhDocBson.Select(c =>
        //         {
        //             var phanQuyenNhomNguoiDungNganhDoc =
        //                 BsonSerializer.Deserialize<PhanQuyenNhomNguoiDungNganhDoc>(c);
        //             if (c.Contains("IdNganhDoc") && c["IdNganhDoc"].AsBsonArray.Any())
        //             {
        //                 phanQuyenNhomNguoiDungNganhDoc.IDNganhDoc.AddRange(
        //                     c["IdNganhDoc"].AsBsonArray.Select(c => c.AsString));
        //             }

        //             return phanQuyenNhomNguoiDungNganhDoc;
        //         }); 
        //         await Global.CollectionPhanQuyenNguoiDung!.DeleteManyAsync(
        //             Builders<PhanQuyenNguoiDung>.Filter.In(x => x.IDNguoiDung, userIds) &
        //             Builders<PhanQuyenNguoiDung>.Filter.In(x => x.IDNhomNguoiDung, groupIds));
        //         await Global.CollectionPhanQuyenPhanHeNguoiDung!.DeleteManyAsync(
        //             Builders<PhanQuyenPhanHeNguoiDung>.Filter.In(x => x.IDNguoiDung, userIds) &
        //             Builders<PhanQuyenPhanHeNguoiDung>.Filter.In(x => x.IDNhomNguoiDung, groupIds));
        //         await Global.CollectionPhanQuyenNguoiDungNganhDoc!.DeleteManyAsync(
        //             Builders<PhanQuyenNguoiDungNganhDoc>.Filter.In(x => x.IDNguoiDung, userIds) &
        //             Builders<PhanQuyenNguoiDungNganhDoc>.Filter.In(x => x.IDNhomNguoiDung, groupIds));
        //         var phanQuyenNguoiDungs = new List<PhanQuyenNguoiDung>();
        //         var phanQuyenPhanHeNguoiDungs = new List<PhanQuyenPhanHeNguoiDung>();
        //         var phanQuyenNguoiDungNganhDocs = new List<PhanQuyenNguoiDungNganhDoc>();
        //         foreach (var userId in userIds)
        //         {
        //             phanQuyenNguoiDungs.AddRange(listPhanQuyenNhomNguoiDung.Select(c=>
        //             {
        //                 var obj = new PhanQuyenNguoiDung
        //                 {
        //                     Id = ObjectId.GenerateNewId().ToString(),
        //                     IDNguoiDung = userId,
        //                     MaChucNang = c.MaChucNang,
        //                     TieuDeChucNang = c.TieuDeChucNang,
        //                     MaPhanHe = c.MaPhanHe,
        //                     TieuDeNhom = c.TieuDeNhomQuyen,
        //                     IDNhomNguoiDung = c.IDNhomNguoiDung,
        //                     NguoiTao = context.GetUserID(),
        //                     NguoiSua = context.GetUserID(),
        //                     NgayTao = Timestamp.FromDateTime(DateTime.UtcNow),
        //                     NgaySua = Timestamp.FromDateTime(DateTime.UtcNow)
        //                 };
        //                 foreach (KeyValuePair<string, bool> keyValuePair in c.Actions)
        //                 {
        //                     obj.Actions.Add(keyValuePair.Key, keyValuePair.Value);
        //                 } 
        //                 return obj;
        //             })); 
        //             phanQuyenPhanHeNguoiDungs.AddRange(listPhanHeNhomNguoiDung.Select(c=>new PhanQuyenPhanHeNguoiDung
        //             {
        //                 Id = ObjectId.GenerateNewId().ToString(),
        //                 IDNguoiDung = userId,
        //                 MaPhanHe = c.MaPhanHe,
        //                 TieuDePhanHe = c.TieuDePhanHe,
        //                 DuocTruyCap = c.DuocTruyCap,
        //                 DuocQuanTri = c.DuocQuanTri,
        //                 IDNhomNguoiDung = c.IDNhomNguoiDung,
        //                 NguoiTao = context.GetUserID(),
        //                 NguoiSua = context.GetUserID(),
        //                 NgayTao = Timestamp.FromDateTime(DateTime.UtcNow),
        //                 NgaySua = Timestamp.FromDateTime(DateTime.UtcNow)
        //             }));
        //             phanQuyenNguoiDungNganhDocs.AddRange(listPhanQuyenNhomNguoiDungNganhDoc.Select(c =>
        //             {
        //                 var obj = new PhanQuyenNguoiDungNganhDoc
        //                 {
        //                     Id = ObjectId.GenerateNewId().ToString(),
        //                     IDNguoiDung = userId,
        //                     MaPhanHe = c.MaPhanHe,
        //                     IDNhomNguoiDung = c.IDNhomNguoiDung,
        //                     NguoiTao = context.GetUserID(),
        //                     NguoiSua = context.GetUserID(),
        //                     NgayTao = Timestamp.FromDateTime(DateTime.UtcNow),
        //                     NgaySua = Timestamp.FromDateTime(DateTime.UtcNow)
        //                 };
        //                 obj.IDNganhDoc.AddRange(c.IDNganhDoc);
        //                 return obj;
        //             })); 
        //         }

        //         if (phanQuyenNguoiDungs.Any())
        //         {
        //             await Global.CollectionPhanQuyenNguoiDung.InsertManyAsync(phanQuyenNguoiDungs);
        //         }
        //         if (phanQuyenPhanHeNguoiDungs.Any())
        //         {
        //             await Global.CollectionPhanQuyenPhanHeNguoiDung.InsertManyAsync(phanQuyenPhanHeNguoiDungs);
        //         }
        //         if (phanQuyenNguoiDungNganhDocs.Any())
        //         {
        //             await Global.CollectionPhanQuyenNguoiDungNganhDoc.InsertManyAsync(phanQuyenNguoiDungNganhDocs);
        //         }

        //         foreach (var userId in userIds)
        //         {
        //             await DoChangePermissionUser(_hubContext, userId);
        //         }
        //     }
        //     catch (Exception e)
        //     {
        //         context?.LogError(e);
        //     }
        //     return true;
        // }

        // public static async Task<bool> UpdateUserPermission(string maPhanHe, string? userId, ServerCallContext? context)
        // {
        //     try
        //     {
        //         if (Global.CollectionPhanQuyenPhanHeNguoiDung != null)
        //         {
        //             await Global.CollectionPhanQuyenPhanHeNguoiDung.DeleteManyAsync(
        //                 Builders<PhanQuyenPhanHeNguoiDung>.Filter.Eq(x => x.IDNguoiDung, userId) &
        //                 Builders<PhanQuyenPhanHeNguoiDung>.Filter.Eq(x => x.MaPhanHe, maPhanHe));
        //         }

        //         if (Global.CollectionPhanQuyenNguoiDung != null)
        //         {
        //             await Global.CollectionPhanQuyenNguoiDung.DeleteManyAsync(
        //                 Builders<PhanQuyenNguoiDung>.Filter.Eq(x => x.IDNguoiDung, userId) &
        //                 Builders<PhanQuyenNguoiDung>.Filter.Eq(x => x.MaPhanHe, maPhanHe));
        //         }

        //         if (Global.CollectionPhanQuyenNguoiDungNganhDoc != null)
        //         {
        //             await Global.CollectionPhanQuyenNguoiDungNganhDoc.DeleteManyAsync(
        //                 Builders<PhanQuyenNguoiDungNganhDoc>.Filter.Eq(x => x.IDNguoiDung, userId) &
        //                 Builders<PhanQuyenNguoiDungNganhDoc>.Filter.Eq(x => x.MaPhanHe, maPhanHe));
        //         }

        //         var idNhomNguoiDungThuocPhanHes = Global.CollectionNhomNguoiDung.Find(c => c.MaPhanHe == maPhanHe)
        //             .ToList().Select(c => c.Id);
        //         var nhomNguoiDungIDs = Global.CollectionNguoiDungNhomNguoiDung
        //             .Find(Builders<NguoiDungNhomNguoiDung>.Filter.Eq(x => x.IDNguoiDung, userId) &
        //                   Builders<NguoiDungNhomNguoiDung>.Filter.In(x => x.IDNhomNguoiDung,
        //                       idNhomNguoiDungThuocPhanHes)).ToList()
        //             .Select(c => c.IDNhomNguoiDung).ToList();
        //         if (nhomNguoiDungIDs.Any())
        //         {
        //             #region Xử lý phân quyền người dùng - ngành dọc

        //             var dictPhanQuyenNguoiDungNganhDoc = new Dictionary<string, PhanQuyenNguoiDungNganhDoc>();
        //             var listPhanQuyenNhomNguoiDungNganhDoc =
        //                 Global.CollectionPhanQuyenNhomNguoiDungNganhDocBson.Find(
        //                     Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomNguoiDungIDs)).ToList();

        //             foreach (var phanQuyenNhomNguoiDungNganhDocBson in listPhanQuyenNhomNguoiDungNganhDoc)
        //             {
        //                 if (!phanQuyenNhomNguoiDungNganhDocBson["IdNganhDoc"].AsBsonArray.Any())
        //                     continue;
        //                 var phanQuyenNhomNguoiDungNganhDoc =
        //                     BsonSerializer.Deserialize<PhanQuyenNhomNguoiDungNganhDoc>(
        //                         phanQuyenNhomNguoiDungNganhDocBson);
        //                 if (dictPhanQuyenNguoiDungNganhDoc.ContainsKey(phanQuyenNhomNguoiDungNganhDoc.MaPhanHe))
        //                 {
        //                     dictPhanQuyenNguoiDungNganhDoc[phanQuyenNhomNguoiDungNganhDoc.MaPhanHe].IDNganhDoc
        //                         .AddRange(phanQuyenNhomNguoiDungNganhDocBson["IdNganhDoc"].AsBsonArray
        //                             .Select(c => c.AsString));
        //                 }
        //                 else
        //                 {
        //                     var phanQuyenNguoiDungNganhDoc = new PhanQuyenNguoiDungNganhDoc()
        //                     {
        //                         Id = ObjectId.GenerateNewId().ToString(),
        //                         IDNguoiDung = userId,
        //                         MaPhanHe = phanQuyenNhomNguoiDungNganhDoc.MaPhanHe,
        //                         NguoiTao = context.GetUserID(),
        //                         NgayTao = Timestamp.FromDateTime(DateTime.UtcNow)
        //                     };
        //                     dictPhanQuyenNguoiDungNganhDoc.Add(phanQuyenNhomNguoiDungNganhDoc.MaPhanHe, phanQuyenNguoiDungNganhDoc);
        //                     phanQuyenNguoiDungNganhDoc.IDNganhDoc.AddRange(
        //                         phanQuyenNhomNguoiDungNganhDocBson["IdNganhDoc"].AsBsonArray
        //                             .Select(c => c.AsString));
        //                 }
        //             }

        //             if (Global.CollectionPhanQuyenNguoiDungNganhDoc != null)
        //             {
        //                 foreach (var phanQuyenNguoiDungNganhDoc in dictPhanQuyenNguoiDungNganhDoc)
        //                 {
        //                     var idNganhDocs = phanQuyenNguoiDungNganhDoc.Value.IDNganhDoc.ToList().Distinct();
        //                     phanQuyenNguoiDungNganhDoc.Value.IDNganhDoc.Clear();
        //                     phanQuyenNguoiDungNganhDoc.Value.IDNganhDoc.AddRange(idNganhDocs);
        //                     await Global.CollectionPhanQuyenNguoiDungNganhDoc.InsertOneAsync(phanQuyenNguoiDungNganhDoc.Value);
        //                 }
        //             }
        //             #endregion

        //             #region Xử lý phân quyền người dùng - phân hệ

        //             var dictNguoiDungPhanHe = new Dictionary<string, PhanQuyenPhanHeNguoiDung>();
        //             var listPhanHeNhomNguoiDung =
        //                 Global.CollectionPhanQuyenPhanHeNhomNguoiDung.Find(
        //                     Builders<PhanQuyenPhanHeNhomNguoiDung>.Filter.In(x => x.IDNhomNguoiDung, nhomNguoiDungIDs)).ToList();
        //             foreach (var phanHeNhomNguoiDung in listPhanHeNhomNguoiDung)
        //             {
        //                 if (!phanHeNhomNguoiDung.DuocTruyCap && !phanHeNhomNguoiDung.DuocQuanTri)
        //                     continue;
        //                 if (dictNguoiDungPhanHe.ContainsKey(phanHeNhomNguoiDung.MaPhanHe))
        //                 {
        //                     dictNguoiDungPhanHe[phanHeNhomNguoiDung.MaPhanHe].DuocTruyCap |= phanHeNhomNguoiDung.DuocTruyCap;
        //                     dictNguoiDungPhanHe[phanHeNhomNguoiDung.MaPhanHe].DuocQuanTri |= phanHeNhomNguoiDung.DuocQuanTri;
        //                 }
        //                 else
        //                 {
        //                     var phanQuyenPhanHeNguoiDung = new PhanQuyenPhanHeNguoiDung()
        //                     {
        //                         Id = ObjectId.GenerateNewId().ToString(),
        //                         IDNguoiDung = userId,
        //                         MaPhanHe = phanHeNhomNguoiDung.MaPhanHe,
        //                         TieuDePhanHe = phanHeNhomNguoiDung.TieuDePhanHe,
        //                         DuocQuanTri = phanHeNhomNguoiDung.DuocQuanTri,
        //                         DuocTruyCap = phanHeNhomNguoiDung.DuocTruyCap,
        //                         NguoiTao = context.GetUserID(),
        //                         NgayTao = Timestamp.FromDateTime(DateTime.UtcNow)
        //                     };
        //                     dictNguoiDungPhanHe.Add(phanHeNhomNguoiDung.MaPhanHe, phanQuyenPhanHeNguoiDung);
        //                 }
        //             }
        //             if (Global.CollectionPhanQuyenPhanHeNguoiDung != null)
        //             {
        //                 await Global.CollectionPhanQuyenPhanHeNguoiDung.DeleteManyAsync(
        //                     Builders<PhanQuyenPhanHeNguoiDung>.Filter.Eq(x => x.IDNguoiDung, userId) &
        //                     Builders<PhanQuyenPhanHeNguoiDung>.Filter.Eq(x => x.MaPhanHe, maPhanHe));
        //                 await Global.CollectionPhanQuyenPhanHeNguoiDung.InsertManyAsync(dictNguoiDungPhanHe.Select(c => c.Value));
        //             }
        //             #endregion

        //             #region Xử lý phân quyền người dùng

        //             var dictPhanQuyenNguoiDung = new Dictionary<string, PhanQuyenNguoiDung>();
        //             //var listComponentPermissions = new List<PhanQuyenPhanHeNguoiDung>();
        //             foreach (var idNhomNguoiDung in nhomNguoiDungIDs)
        //             {
        //                 if (!string.IsNullOrEmpty(idNhomNguoiDung))
        //                 {
        //                     var phanQuyenNhomNguoiDung = Global.CollectionPhanQuyenNhomNguoiDungBson.Find(
        //                             Builders<BsonDocument>.Filter.Eq(x => x["IdNhomNguoiDung"], idNhomNguoiDung))
        //                         .ToList().Select(c =>
        //                         {
        //                             var userGroupPermission = BsonSerializer.Deserialize<PhanQuyenNhomNguoiDung>(c);
        //                             if (c.Contains("Actions"))
        //                             {
        //                                 foreach (var item in c["Actions"].AsBsonDocument.Elements)
        //                                 {
        //                                     userGroupPermission.Actions.Add(item.Name, item.Value.AsBoolean);
        //                                 }
        //                             }
        //                             return userGroupPermission;
        //                         }).ToList();
        //                     if (phanQuyenNhomNguoiDung is { Count: > 0 })
        //                     {
        //                         foreach (var item in phanQuyenNhomNguoiDung)
        //                         {
        //                             var key = item.MaPhanHe + "." + item.MaChucNang;
        //                             PhanQuyenNguoiDung? phanQuyenNguoiDung = null;
        //                             if (dictPhanQuyenNguoiDung.ContainsKey(key))
        //                             {
        //                                 phanQuyenNguoiDung = dictPhanQuyenNguoiDung[key];

        //                             }
        //                             else
        //                             {
        //                                 phanQuyenNguoiDung = new PhanQuyenNguoiDung()
        //                                 {
        //                                     Id = ObjectId.GenerateNewId().ToString(),
        //                                     IDNguoiDung = userId,
        //                                     MaPhanHe = item.MaPhanHe,
        //                                     MaChucNang = item.MaChucNang,
        //                                     NguoiTao = context.GetUserID(),
        //                                     NgayTao = Timestamp.FromDateTime(DateTime.UtcNow)
        //                                 };
        //                                 dictPhanQuyenNguoiDung.Add(key, phanQuyenNguoiDung);
        //                             }
        //                             foreach (var action in item.Actions)
        //                             {
        //                                 if (phanQuyenNguoiDung.Actions.ContainsKey(action.Key))
        //                                     phanQuyenNguoiDung.Actions[action.Key] |= action.Value;
        //                                 else
        //                                     phanQuyenNguoiDung.Actions.Add(action.Key, action.Value);
        //                             }
        //                         }
        //                     }
        //                 }

        //             }
        //             if (Global.CollectionPhanQuyenNguoiDung != null && dictPhanQuyenNguoiDung.Count > 0)
        //                 await Global.CollectionPhanQuyenNguoiDung.InsertManyAsync(dictPhanQuyenNguoiDung.Select(c => c.Value));
        //             // if (Global.CollectionPhanQuyenPhanHeNguoiDung != null && listComponentPermissions.Count > 0)
        //             //     await Global.CollectionPhanQuyenPhanHeNguoiDung.InsertManyAsync(listComponentPermissions);

        //             #endregion 
        //         }
        //     }
        //     catch (Exception ex)
        //     {
        //         context?.LogError(ex);
        //     }
        //     return false;
        // }

         
        // public static List<string> CheckDeleteAble(string tableOriginName, object idValue)
        // {
        //     List<string> messages = new List<string>();
        //     var builderFilter = Builders<RelationShipObject>.Filter;
        //     var filter = builderFilter.Eq(x => x.OriginName, tableOriginName);
        //     var listRelationShip = Global.CollectionRelationShipObject.Find(filter).ToEnumerable();
        //     foreach (var item in listRelationShip)
        //     {
        //         if (string.IsNullOrEmpty(item.RelativeName))
        //             continue;
        //         if (item.DeleteAlway)
        //         {
        //             var collection = Global.MongoDB?.GetCollection<BsonDocument>(item.RelativeName);
        //             if (collection != null && !string.IsNullOrEmpty(item.RelativeKeyField))
        //             {
        //                 var result = collection.DeleteMany(Builders<BsonDocument>.Filter.Eq(item.RelativeKeyField, idValue + ""));
        //             }
        //         }
        //         else
        //         {
        //             var collection = Global.MongoDB?.GetCollection<BsonDocument>(item.RelativeName);
        //             if (collection != null)
        //             {
        //                 var count = collection
        //                     .Find(Builders<BsonDocument>.Filter.Eq(item.RelativeKeyField, idValue + ""))
        //                     .CountDocuments();
        //                 if (count > 0)
        //                 {
        //                     var message = !messages.Any() ? $"Tồn tại: {count} bản ghi dữ liệu " + item.RelativeCaption : $"{count} bản ghi dữ liệu " + item.RelativeCaption;
        //                     if (!messages.Contains(message))
        //                         messages.Add(message);
        //                 }
        //             }
        //         }
        //     }

        //     return messages;
        // }

        // public static bool DeleteRelationShip(string tableOriginName, object oldID)
        // {
        //     try
        //     {
        //         List<string> messages = new List<string>();
        //         var builderFilter = Builders<RelationShipObject>.Filter;
        //         var filter = builderFilter.Eq(x => x.OriginName, tableOriginName);
        //         var listRelationShip = Global.CollectionRelationShipObject.Find(filter).ToEnumerable();
        //         foreach (var item in listRelationShip)
        //         {
        //             if (string.IsNullOrEmpty(item.RelativeName) || !item.DeleteAlway)
        //                 continue;
        //             var collection = Global.MongoDB?.GetCollection<BsonDocument>(item.RelativeName);
        //             if (collection != null)
        //             {
        //                 var result = collection.DeleteMany(Builders<BsonDocument>.Filter.Eq(item.RelativeKeyField, oldID + ""));
        //             }
        //         }
        //         return true;
        //     }
        //     catch (Exception ex)
        //     {
        //         Services.LogService.LogError(ex);
        //     }
        //     return false;
        // }
        public static bool UpdateRelationShip(string tableOriginName, object oldID, object newID)
        {
            try
            {
                List<string> messages = new List<string>();
                var builderFilter = Builders<RelationShipObject>.Filter;
                var filter = builderFilter.Eq(x => x.OriginName, tableOriginName);
                var listRelationShip = Backend.Services.Global.CollectionRelationShipObject.Find(filter).ToEnumerable();
                foreach (var item in listRelationShip)
                {
                    if (string.IsNullOrEmpty(item.RelativeName))
                        continue;
                    var collection = Backend.Services.Global.MongoDB?.GetCollection<BsonDocument>(item.RelativeName);
                    if (collection != null)
                    {
                        var result = collection.UpdateMany(
                            Builders<BsonDocument>.Filter.Eq(item.RelativeKeyField, oldID + ""),
                            Builders<BsonDocument>.Update.Set(item.RelativeKeyField, newID + ""));
                    }
                }
                return true;
            }
            catch (Exception ex)
            {
               // Services.LogService.LogError(ex);
            }
            return false;
        }

        public static void ExecuteCommand(string command)
        {
            var processInfo = new ProcessStartInfo("cmd.exe", "/c " + command);
            processInfo.CreateNoWindow = false;
            processInfo.UseShellExecute = false;
            processInfo.RedirectStandardError = true;
            processInfo.RedirectStandardOutput = true;

            var process = Process.Start(processInfo);
            //
            // process.OutputDataReceived += (object sender, DataReceivedEventArgs e) =>
            //     Console.WriteLine("output>>" + e.Data);
            // process.BeginOutputReadLine();
            //
            // process.ErrorDataReceived += (object sender, DataReceivedEventArgs e) =>
            //     Console.WriteLine("error>>" + e.Data);
            // process.BeginErrorReadLine();
            //
            // process?.WaitForExit();
            //
            // Console.WriteLine("ExitCode: {0}", process?.ExitCode);
            // process?.Close();
        }

        // public static Employee? GetUser(string? userId)
        // {
        //     var filter = Builders<BsonDocument>.Filter.Eq("_id", userId);
        //     var userBson = Global.CollectionEmployeeBson.Find<BsonDocument>(filter).FirstOrDefault();
        //     if (userBson != null)
        //     {
        //         var user = BsonSerializer.Deserialize<Employee>(userBson);
        //         if (userBson.Contains("Parameters"))
        //         {
        //             var parameters = userBson["Parameters"].AsBsonArray.Select(c => BsonSerializer.Deserialize<ExtendedField>(c.AsBsonDocument)).ToArray();
        //             user.Parameters.AddRange(parameters);
        //         }
        //         if (userBson.Contains("ChangePasswordHistorys"))
        //         {
        //             var changePasswordHistorys = userBson["ChangePasswordHistorys"].AsBsonArray.Select(c => BsonSerializer.Deserialize<ChangePasswordHistory>(c.AsBsonDocument)).ToArray();
        //             user.LichSuThayDoiMatKhau.AddRange(changePasswordHistorys);
        //         }
        //         // if (userBson.Contains("VerticalRoles"))
        //         // {
        //         //     var verticalRoles = userBson["VerticalRoles"].AsBsonArray.Select(c => c.AsString).ToArray();
        //         //     user.VerticalRoles.AddRange(verticalRoles);
        //         // }

        //         return user;
        //     }

        //     return null;
        // }

        public static string RemoveVietnameseTones(string str)
        {
            string[] vietnameseSigns = new string[]
            {
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
            };

            for (int i = 1; i < vietnameseSigns.Length; i++)
            {
                for (int j = 0; j < vietnameseSigns[i].Length; j++)
                    str = str.Replace(vietnameseSigns[i][j], vietnameseSigns[0][i - 1]);
            }
            return str.ToLower();
        }
    }
