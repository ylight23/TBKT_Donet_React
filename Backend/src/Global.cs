using Backend.Models;
using Backend.Services;
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

        BsonClassMap.RegisterClassMap<Employee>(c =>
        {
            c.AutoMap();
        });
        BsonClassMap.RegisterClassMap<Office>(c =>
        {
            c.AutoMap();
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
            c.MapProperty(x => x.Fields);
            c.SetIgnoreExtraElements(true);
            c.MapIdProperty(x => x.Id);
        });
        BsonClassMap.RegisterClassMap<FormTabConfig>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.FieldSets);
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
            c.MapProperty(x => x.ColumnKeys);
            c.MapProperty(x => x.ColumnNames);

        });


        // Note: Using BsonDocument and manual mapping for Proto classes to handle RepeatedField correctly.

        // Initialize default Office item with ID "000"
        InitializeDefaultOffice();

        app.MapGrpcService<EmployeeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<OfficeServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<CatalogServiceImpl>().EnableGrpcWeb().RequireAuthorization();
        app.MapGrpcService<ThamSoServiceImpl>().EnableGrpcWeb().RequireAuthorization();

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
                NgayTao = existingOffice?.NgayTao ?? Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(DateTime.UtcNow),
                NguoiTao = existingOffice?.NguoiTao ?? "System",
                NgaySua = Google.Protobuf.WellKnownTypes.Timestamp.FromDateTime(DateTime.UtcNow),
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
}
