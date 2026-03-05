using Backend.Services;
using protos;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

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
    private static IMongoCollection<BsonDocument>? _collectionDynamicField;
    public static IMongoCollection<BsonDocument>? CollectionDynamicField
    {
        get
        {
            if (_collectionDynamicField == null)
                _collectionDynamicField = MongoDB?.GetCollection<BsonDocument>("DynamicField");
            return _collectionDynamicField;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionFieldSet;
    public static IMongoCollection<BsonDocument>? CollectionFieldSet
    {
        get
        {
            if (_collectionFieldSet == null)
                _collectionFieldSet = MongoDB?.GetCollection<BsonDocument>("FieldSet");
            return _collectionFieldSet;
        }
    }

    private static IMongoCollection<BsonDocument>? _collectionFormConfig;
    public static IMongoCollection<BsonDocument>? CollectionFormConfig
    {
        get
        {
            if (_collectionFormConfig == null)
                _collectionFormConfig = MongoDB?.GetCollection<BsonDocument>("FormConfig");
            return _collectionFormConfig;
        }
    }


    public static void UseEmployeeServices(this WebApplication app, IConfiguration config, string version)
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

        
        // BsonSerializer.RegisterSerializer(
        //     typeof(Google.Protobuf.Collections.RepeatedField<string>),
        //     Backend.Models.RepeatedFieldStringSerializer.Instance);

        BsonClassMap.RegisterClassMap<Employee>(c =>
        {
            c.AutoMap();
        });
        BsonClassMap.RegisterClassMap<Office>(c =>
        {
            c.AutoMap();
            c.MapProperty(x => x.Parameters);
        });

        // ── ThamSo BsonClassMap ──────────────────────────────────────────
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
