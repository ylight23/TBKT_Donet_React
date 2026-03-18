using Backend.Models;
using Backend.Services;
using Backend.Utils;
using protos;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using Google.Protobuf.Collections;

namespace Backend.Services;

public static class Global
{
    // Static Logger for entire application
    public static ILogger? Logger { get; set; }

    public static MongoDB.Driver.MongoClient? MongoClient { get; set; }
    public static MongoDB.Driver.IMongoDatabase? MongoDB { set; get; }

    public static string? UriConnection { set; get; } = "localhost:27017";
    public static string? DBName { set; get; } = "";

    private static IMongoCollection<Employee>? _collectionEmployee;

    public static IMongoCollection<Employee>? CollectionEmployee
    {
        get
        {
            if (_collectionEmployee == null)
                _collectionEmployee = MongoDB?.GetCollection<Employee>("Employee");
            return _collectionEmployee;

        }
    }
    private static IMongoCollection<Office>? _collectionOffice;

    public static IMongoCollection<Office>? CollectionOffice
    {
        get
        {
            if (_collectionOffice == null)
                _collectionOffice = MongoDB?.GetCollection<Office>("Office");
            return _collectionOffice;

        }
    }
    private static IMongoCollection<Catalog>? _collectionCapBac;

    public static IMongoCollection<Catalog>? CollectionCapBac
    {
        get
        {
            if (_collectionCapBac == null)
                _collectionCapBac = MongoDB?.GetCollection<Catalog>("CapBac");
            return _collectionCapBac;

        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonEmployee;
    public static IMongoCollection<BsonDocument>? CollectionBsonEmployee
    {
        get
        {
            if (_collectionBsonEmployee == null)
                _collectionBsonEmployee = MongoDB?.GetCollection<BsonDocument>("Employee");
            return _collectionBsonEmployee;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonOffice;
    public static IMongoCollection<BsonDocument>? CollectionBsonOffice
    {
        get
        {
            if (_collectionBsonOffice == null)
                _collectionBsonOffice = MongoDB?.GetCollection<BsonDocument>("Office");
            return _collectionBsonOffice;
        }
    }
    private static IMongoCollection<BsonDocument>? _collectionBsonCapBac;
    public static IMongoCollection<BsonDocument>? CollectionBsonCapBac
    {
        get
        {
            if (_collectionBsonCapBac == null)
                _collectionBsonCapBac = MongoDB?.GetCollection<BsonDocument>("CapBac");
            return _collectionBsonCapBac;
        }
    }

    private static IMongoCollection<RelationShipObject>? collectionRelationShipObject;
    public static IMongoCollection<RelationShipObject>? CollectionRelationShipObject
    {
        get
        {
            if (collectionRelationShipObject == null)
                collectionRelationShipObject = MongoDB?.GetCollection<RelationShipObject>("RelationShips");
            return collectionRelationShipObject;
        }
    }
    private static IMongoCollection<BsonDocument>? collectionBsonRelationShipObject;
    public static IMongoCollection<BsonDocument>? CollectionBsonRelationShipObject
    {
        get
        {
            if (collectionBsonRelationShipObject == null)
                collectionBsonRelationShipObject = MongoDB?.GetCollection<BsonDocument>("RelationShips");
            return collectionBsonRelationShipObject;
        }
    }

    // ── ThamSo collections (Using BsonDocument for manual mapping) ───
    private static IMongoCollection<BsonDocument>? _collectionBsonDynamicField;
    public static IMongoCollection<BsonDocument>? CollectionBsonDynamicField
    {
        get
        {
            if (_collectionBsonDynamicField == null)
                _collectionBsonDynamicField = MongoDB?.GetCollection<BsonDocument>("DynamicField");
            return _collectionBsonDynamicField;
        }
    }

    private static IMongoCollection<DynamicField>? collectionDynamicField;
    public static IMongoCollection<DynamicField>? CollectionDynamicField
    {
        get
        {
            if (collectionDynamicField == null)
                collectionDynamicField = MongoDB?.GetCollection<DynamicField>("DynamicField");
            return collectionDynamicField;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonFieldSet;
    public static IMongoCollection<BsonDocument>? CollectionBsonFieldSet
    {
        get
        {
            if (_collectionBsonFieldSet == null)
                _collectionBsonFieldSet = MongoDB?.GetCollection<BsonDocument>("FieldSet");
            return _collectionBsonFieldSet;
        }
    }

    private static IMongoCollection<FieldSet>? collectionFieldSet;
    public static IMongoCollection<FieldSet>? CollectionFieldSet
    {
        get
        {
            if (collectionFieldSet == null)
                collectionFieldSet = MongoDB?.GetCollection<FieldSet>("FieldSet");
            return collectionFieldSet;
        }
    }
    private static IMongoCollection<BsonDocument>? _collectionBsonFormConfig;
    public static IMongoCollection<BsonDocument>? CollectionBsonFormConfig
    {
        get
        {
            if (_collectionBsonFormConfig == null)
                _collectionBsonFormConfig = MongoDB?.GetCollection<BsonDocument>("FormConfig");
            return _collectionBsonFormConfig;
        }
    }
    private static IMongoCollection<FormConfig>? collectionFormConfig;
    public static IMongoCollection<FormConfig>? CollectionFormConfig
    {
        get
        {
            if (collectionFormConfig == null)
                collectionFormConfig = MongoDB?.GetCollection<FormConfig>("FormConfig");
            return collectionFormConfig;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonDynamicMenu;
    public static IMongoCollection<BsonDocument>? CollectionBsonDynamicMenu
    {
        get
        {
            if (_collectionBsonDynamicMenu == null)
                _collectionBsonDynamicMenu = MongoDB?.GetCollection<BsonDocument>("DynamicMenu");
            return _collectionBsonDynamicMenu;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonDynamicMenuDataSource;
    public static IMongoCollection<BsonDocument>? CollectionBsonDynamicMenuDataSource
    {
        get
        {
            if (_collectionBsonDynamicMenuDataSource == null)
                _collectionBsonDynamicMenuDataSource = MongoDB?.GetCollection<BsonDocument>("DynamicMenuDataSource");
            return _collectionBsonDynamicMenuDataSource;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionBsonTemplateLayout;
    public static IMongoCollection<BsonDocument>? CollectionBsonTemplateLayout
    {
        get
        {
            if (_collectionBsonTemplateLayout == null)
                _collectionBsonTemplateLayout = MongoDB?.GetCollection<BsonDocument>("TemplateLayout");
            return _collectionBsonTemplateLayout;
        }
    }

    // ── Permission management collections ─────────────────────────────────────

    private static IMongoCollection<NhomNguoiDung>? _collectionNhomNguoiDung;
    public static IMongoCollection<NhomNguoiDung>? CollectionNhomNguoiDung
    {
        get
        {
            if (_collectionNhomNguoiDung == null)
                _collectionNhomNguoiDung = MongoDB?.GetCollection<NhomNguoiDung>("NhomNguoiDung");
            return _collectionNhomNguoiDung;
        }
    }

    private static IMongoCollection<NguoiDungNhomNguoiDung>? _collectionNguoiDungNhomNguoiDung;
    public static IMongoCollection<NguoiDungNhomNguoiDung>? CollectionNguoiDungNhomNguoiDung
    {
        get
        {
            if (_collectionNguoiDungNhomNguoiDung == null)
                _collectionNguoiDungNhomNguoiDung = MongoDB?.GetCollection<NguoiDungNhomNguoiDung>("NguoiDungNhomNguoiDung");
            return _collectionNguoiDungNhomNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenPhanHeNguoiDung>? _collectionPhanQuyenPhanHeNguoiDung;
    public static IMongoCollection<PhanQuyenPhanHeNguoiDung>? CollectionPhanQuyenPhanHeNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenPhanHeNguoiDung == null)
                _collectionPhanQuyenPhanHeNguoiDung = MongoDB?.GetCollection<PhanQuyenPhanHeNguoiDung>("PhanQuyenPhanHeNguoiDung");
            return _collectionPhanQuyenPhanHeNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenPhanHeNhomNguoiDung>? _collectionPhanQuyenPhanHeNhomNguoiDung;
    public static IMongoCollection<PhanQuyenPhanHeNhomNguoiDung>? CollectionPhanQuyenPhanHeNhomNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenPhanHeNhomNguoiDung == null)
                _collectionPhanQuyenPhanHeNhomNguoiDung = MongoDB?.GetCollection<PhanQuyenPhanHeNhomNguoiDung>("PhanQuyenPhanHeNhomNguoiDung");
            return _collectionPhanQuyenPhanHeNhomNguoiDung;
        }
    }

    // PhanQuyenNguoiDung - typed (write) + BsonDocument (read with manual Actions mapping)
    private static IMongoCollection<PhanQuyenNguoiDung>? _collectionPhanQuyenNguoiDung;
    public static IMongoCollection<PhanQuyenNguoiDung>? CollectionPhanQuyenNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenNguoiDung == null)
                _collectionPhanQuyenNguoiDung = MongoDB?.GetCollection<PhanQuyenNguoiDung>("PhanQuyenNguoiDung");
            return _collectionPhanQuyenNguoiDung;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionPhanQuyenNguoiDungBson;
    public static IMongoCollection<BsonDocument>? CollectionPhanQuyenNguoiDungBson
    {
        get
        {
            if (_collectionPhanQuyenNguoiDungBson == null)
                _collectionPhanQuyenNguoiDungBson = MongoDB?.GetCollection<BsonDocument>("PhanQuyenNguoiDung");
            return _collectionPhanQuyenNguoiDungBson;
        }
    }

    // PhanQuyenNhomNguoiDung - BsonDocument for read (Actions field), typed for write
    private static IMongoCollection<BsonDocument>? _collectionPhanQuyenNhomNguoiDungBson;
    public static IMongoCollection<BsonDocument>? CollectionPhanQuyenNhomNguoiDungBson
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDungBson == null)
                _collectionPhanQuyenNhomNguoiDungBson = MongoDB?.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDung");
            return _collectionPhanQuyenNhomNguoiDungBson;
        }
    }

    private static IMongoCollection<PhanQuyenNhomNguoiDung>? _collectionPhanQuyenNhomNguoiDung;
    public static IMongoCollection<PhanQuyenNhomNguoiDung>? CollectionPhanQuyenNhomNguoiDung
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDung == null)
                _collectionPhanQuyenNhomNguoiDung = MongoDB?.GetCollection<PhanQuyenNhomNguoiDung>("PhanQuyenNhomNguoiDung");
            return _collectionPhanQuyenNhomNguoiDung;
        }
    }

    private static IMongoCollection<PhanQuyenNguoiDungNganhDoc>? _collectionPhanQuyenNguoiDungNganhDoc;
    public static IMongoCollection<PhanQuyenNguoiDungNganhDoc>? CollectionPhanQuyenNguoiDungNganhDoc
    {
        get
        {
            if (_collectionPhanQuyenNguoiDungNganhDoc == null)
                _collectionPhanQuyenNguoiDungNganhDoc = MongoDB?.GetCollection<PhanQuyenNguoiDungNganhDoc>("PhanQuyenNguoiDungNganhDoc");
            return _collectionPhanQuyenNguoiDungNganhDoc;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionPhanQuyenNhomNguoiDungNganhDocBson;
    public static IMongoCollection<BsonDocument>? CollectionPhanQuyenNhomNguoiDungNganhDocBson
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDungNganhDocBson == null)
                _collectionPhanQuyenNhomNguoiDungNganhDocBson = MongoDB?.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDungNganhDoc");
            return _collectionPhanQuyenNhomNguoiDungNganhDocBson;
        }
    }

    private static IMongoCollection<PhanQuyenNhomNguoiDungNganhDoc>? _collectionPhanQuyenNhomNguoiDungNganhDoc;
    public static IMongoCollection<PhanQuyenNhomNguoiDungNganhDoc>? CollectionPhanQuyenNhomNguoiDungNganhDoc
    {
        get
        {
            if (_collectionPhanQuyenNhomNguoiDungNganhDoc == null)
                _collectionPhanQuyenNhomNguoiDungNganhDoc = MongoDB?.GetCollection<PhanQuyenNhomNguoiDungNganhDoc>("PhanQuyenNhomNguoiDungNganhDoc");
            return _collectionPhanQuyenNhomNguoiDungNganhDoc;
        }
    }

    private static IMongoCollection<ThamSoNguoiDung>? _collectionUserParams;
    public static IMongoCollection<ThamSoNguoiDung>? CollectionUserParams
    {
        get
        {
            if (_collectionUserParams == null)
                _collectionUserParams = MongoDB?.GetCollection<ThamSoNguoiDung>("UserParams");
            return _collectionUserParams;
        }
    }

    public static void UseTBKTServices(this WebApplication app, IConfiguration config, string version)
    {
        // Initialize global logger
        Logger = app.Services.GetRequiredService<ILogger<object>>();

        // Khởi tạo MongoDB connection
        var mongoUri = config.GetValue<string>("MongoDB:Uri") ?? "mongodb://localhost:27017";
        var dbName = config.GetValue<string>("MongoDB:Database") ?? "quanly_dmcanbo";

        try
        {
            Global.MongoClient = new MongoClient(mongoUri);
            Global.MongoDB = Global.MongoClient.GetDatabase(dbName);
            Logger?.LogInformation("MongoDB connected: {MongoUri} - Database: {DbName}", mongoUri, dbName);
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "MongoDB connection failed");
            throw;
        }


        // Đăng ký cho mọi RepeatedField type đang dùng
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<string>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicField>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<FieldSet>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<FormTabConfig>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<FormConfig>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<Office>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<Employee>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<RelationShipObject>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenuDataSourceField>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenuDataSource>());
        BsonSerializer.RegisterSerializer(new RepeatedFieldSerializer<DynamicMenu>());
        BsonSerializer.RegisterSerializer(new MapFieldSerializer<string, bool>());

        BsonClassMap.RegisterClassMap<Employee>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
        });
        BsonClassMap.RegisterClassMap<Office>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapProperty(x => x.Parameters);
        });
        BsonClassMap.RegisterClassMap<FieldValidation>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.Options);
            c.SetIgnoreExtraElements(true);

        });
        BsonClassMap.RegisterClassMap<DynamicField>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapProperty(x => x.Validation);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FieldSet>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.FieldIds);
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FormTabConfig>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.FieldSetIds);
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FormConfig>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.Tabs);
        });

        // ── ThamSo BsonClassMap ──────────────────────────────────────────
        // DynamicMenuDataSource entities
        BsonClassMap.RegisterClassMap<DynamicMenuDataSourceField>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);

        });
        BsonClassMap.RegisterClassMap<DynamicMenuDataSource>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id); 
            c.MapProperty(x => x.Fields);

        });
        BsonClassMap.RegisterClassMap<DynamicMenu>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id); 
            c.MapProperty(x => x.Columns);
        });


        // Note: Using BsonDocument and manual mapping for Proto classes to handle RepeatedField correctly.

        // ── Permission model BsonClassMaps ──────────────────────────────────────
        BsonClassMap.RegisterClassMap<NhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<NguoiDungNhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenPhanHeNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenPhanHeNhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.Actions);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenNhomNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.Actions);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenNguoiDungNganhDoc>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.IdNganhDoc);
        });
        BsonClassMap.RegisterClassMap<PhanQuyenNhomNguoiDungNganhDoc>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
            c.MapProperty(x => x.IdNganhDoc);
        });
        BsonClassMap.RegisterClassMap<ThamSoNguoiDung>(c =>
        {
            c.AutoMap();
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });

        // Initialize default Office item with ID "000"
        InitializeDefaultOffice();

        app.MapGrpcService<EmployeeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<OfficeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<CatalogServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<ThamSoServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<PhanQuyenServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<NhomChuyenNganhServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<LichSuPhanQuyenScopeServiceImpl>().EnableGrpcWeb().RequireAuthorization();

        app.UseStaticFiles(new StaticFileOptions
        {
            ServeUnknownFileTypes = true,
            DefaultContentType = "application/octet-stream"
        });
        app.UseRouting();
        app.MapControllers();
        app.MapFallbackToFile("index.html");



    }

    private static void InitializeDefaultOffice()
    {
        try
        {
            var defaultId = "000";
            var filter = Builders<Office>.Filter.Eq(x => x.Id, defaultId);
            var existingOffice = CollectionOffice?.Find(filter).FirstOrDefault();

            var defaultOffice = new Office
            {
                Id = defaultId,
                Ten = "Bộ Quốc Phòng",
                TenDayDu = "Bộ Quốc Phòng",
                VietTat = "BQP",
                CoCapDuoi = true,
                ThuTu = 0,
                ThuTuSapXep = "000",
                NgayTao = existingOffice?.NgayTao ?? CommonUtils.GetNowTimestamp(),
                NguoiTao = existingOffice?.NguoiTao ?? "System",
                NgaySua = CommonUtils.GetNowTimestamp(),
                NguoiSua = "System"
            };

            if (existingOffice == null)
            {
                CollectionOffice?.InsertOne(defaultOffice);
                Logger?.LogInformation("Created default Office with ID: {DefaultId}", defaultId);
            }
            else
            {
                CollectionOffice?.ReplaceOne(filter, defaultOffice);
                Logger?.LogInformation("Updated default Office with ID: {DefaultId}", defaultId);
            }
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Error initializing default Office");
        }
    }

    // ── Phân quyền: kiểm tra quyền truy cập phân hệ ─────────────────────
    public static bool CanAccessComponent(string userId, string maPhanHe)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;

        // 1. Kiểm tra quyền trực tiếp của user
        var phanHeNDCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenPhanHeNguoiDung");
        var phanHeNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                           & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe)
                           & Builders<BsonDocument>.Filter.Eq("DuocTruyCap", true);
        if (phanHeNDCol.Find(phanHeNDFilter).Any())
            return true;

        // 2. Kiểm tra quyền từ nhóm
        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var phanHeNhomCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenPhanHeNhomNguoiDung");
        var phanHeNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                             & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe)
                             & Builders<BsonDocument>.Filter.Eq("DuocTruyCap", true);
        return phanHeNhomCol.Find(phanHeNhomFilter).Any();
    }

    // ── Phân quyền: kiểm tra quyền thao tác chức năng (với MaPhanHe) ─────
    public static bool CanAccessComponentAction(string userId, string maPhanHe, string funcName, params string[]? actions)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        if (actions == null || actions.Length == 0) return false;

        // 1. Kiểm tra quyền trực tiếp của user
        var pqNDCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNguoiDung");
        var pqNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                       & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName)
                       & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe);
        var pqNDDoc = pqNDCol.Find(pqNDFilter).FirstOrDefault();
        if (pqNDDoc != null && HasAnyAction(pqNDDoc, actions))
            return true;

        // 2. Kiểm tra quyền từ nhóm
        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var pqNhomCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDung");
        var pqNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                         & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName)
                         & Builders<BsonDocument>.Filter.Eq("MaPhanHe", maPhanHe);
        var pqNhomDocs = pqNhomCol.Find(pqNhomFilter).ToList();
        return pqNhomDocs.Any(doc => HasAnyAction(doc, actions));
    }

    // ── Overload: kiểm tra quyền thao tác (bất kỳ MaPhanHe) ──────────────
    public static bool CanAccessComponentAction(string userId, string funcName, params string[]? actions)
    {
        if (MongoDB == null || string.IsNullOrEmpty(userId)) return false;
        if (actions == null || actions.Length == 0) return false;

        var pqNDCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNguoiDung");
        var pqNDFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId)
                       & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName);
        var pqNDDoc = pqNDCol.Find(pqNDFilter).FirstOrDefault();
        if (pqNDDoc != null && HasAnyAction(pqNDDoc, actions))
            return true;

        var nhomIds = GetNhomIds(userId);
        if (nhomIds.Count == 0) return false;

        var pqNhomCol = MongoDB.GetCollection<BsonDocument>("PhanQuyenNhomNguoiDung");
        var pqNhomFilter = Builders<BsonDocument>.Filter.In("IdNhomNguoiDung", nhomIds)
                         & Builders<BsonDocument>.Filter.Eq("MaChucNang", funcName);
        var pqNhomDocs = pqNhomCol.Find(pqNhomFilter).ToList();
        return pqNhomDocs.Any(doc => HasAnyAction(doc, actions));
    }

    // ── Helper: lấy danh sách nhóm (loại bỏ Delegated hết hạn) ───────────
    private static List<string> GetNhomIds(string userId)
    {
        var memberCol = MongoDB!.GetCollection<BsonDocument>("NguoiDungNhomNguoiDung");
        var memberFilter = Builders<BsonDocument>.Filter.Eq("IdNguoiDung", userId);
        var memberDocs = memberCol.Find(memberFilter).ToList();

        var nhomIds = new List<string>();
        foreach (var doc in memberDocs)
        {
            var st = doc.GetValue("ScopeType", BsonNull.Value);
            if (st != BsonNull.Value && st.AsString == "Delegated")
            {
                var hetHan = doc.GetValue("NgayHetHan", BsonNull.Value);
                if (hetHan != BsonNull.Value && hetHan.ToUniversalTime() < DateTime.UtcNow)
                    continue;
            }
            var nhomId = doc.GetValue("IdNhomNguoiDung", BsonNull.Value);
            if (nhomId != BsonNull.Value && !string.IsNullOrEmpty(nhomId.AsString))
                nhomIds.Add(nhomId.AsString);
        }
        return nhomIds;
    }

    // ── Helper: kiểm tra Actions có bất kỳ action nào = true ──────────────
    private static bool HasAnyAction(BsonDocument doc, string[] actions)
    {
        var actionsVal = doc.GetValue("Actions", BsonNull.Value);
        if (actionsVal == BsonNull.Value || !actionsVal.IsBsonDocument)
            return false;

        var a = actionsVal.AsBsonDocument;
        foreach (var action in actions)
        {
            if (a.GetValue(action, false).AsBoolean)
                return true;
        }
        return false;
    }
}
