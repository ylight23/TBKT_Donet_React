using protos;
using Google.Protobuf.WellKnownTypes;
using MongoDB.Driver;

namespace Backend.utils;

public static class PagerUtils
{

    private static object? GetValueOfFilter(ObjectValue? objectValue)
    {
        if (objectValue == null)
            return null;
        object? value = null;
        switch (objectValue.ValueCase)
        {
            case ObjectValue.ValueOneofCase.BoolValue:
                value = objectValue.BoolValue;
                break;
            case ObjectValue.ValueOneofCase.BytesValue:
                value = objectValue.BytesValue;
                break;
            case ObjectValue.ValueOneofCase.DoubleValue:
                value = objectValue.DoubleValue;
                break;
            case ObjectValue.ValueOneofCase.FloatValue:
                value = objectValue.FloatValue;
                break;
            case ObjectValue.ValueOneofCase.Int64Value:
                value = objectValue.Int64Value;
                break;
            case ObjectValue.ValueOneofCase.Timestamp:
                value = objectValue.Timestamp;
                break;
            case ObjectValue.ValueOneofCase.Uint32Value:
                value = objectValue.Uint32Value;
                break;
            case ObjectValue.ValueOneofCase.Uint64Value:
                value = objectValue.Uint64Value;
                break;
            case ObjectValue.ValueOneofCase.Int32Value:
                value = objectValue.Int32Value;
                break;
            case ObjectValue.ValueOneofCase.StringValue:
                value = objectValue.StringValue;
                break;
        }

        return value;
    }

    private static FilterDefinition<T>? GetFilterOperator<T>(string propertyName, FilterOperator filterOperator, object? value)
    {
        var builder = Builders<T>.Filter;
        var filter = builder.Empty;
        if (value == null)
            return filter;
        switch (filterOperator)
        {
            case FilterOperator.Contains:
                filter &= builder.Regex(propertyName, $"/.*{value}.*/i");
                break;
            case FilterOperator.DoesNotContain:
                filter &= builder.Not(builder.Regex(propertyName, $"/.*{value}.*/i"));
                break;
            case FilterOperator.EndsWith:
                filter &= builder.Regex(propertyName, $".*{value}$");
                break;
            case FilterOperator.StartsWith:
                filter &= builder.Regex(propertyName, $"${value}.*/i");
                break;
            case FilterOperator.Equals:
                filter &= builder.Eq(propertyName, value);
                break;
            case FilterOperator.GreaterThan:
                filter &= builder.Gt(propertyName, value);
                break;
            case FilterOperator.GreaterThanOrEquals:
                filter &= builder.Gte(propertyName, value);
                break;
            case FilterOperator.LessThan:
                filter &= builder.Lt(propertyName, value);
                break;
            case FilterOperator.LessThanOrEquals:
                filter &= builder.Lte(propertyName, value);
                break;
            case FilterOperator.NotEquals:
                filter &= builder.Ne(propertyName, value);
                break;
            case FilterOperator.In:
                //filter &= builder.In(item.Property, value);
                break;
            case FilterOperator.NotIn:
                //filter &= builder.Nin(item.Property, value);
                break;
            case FilterOperator.IsEmpty:
                filter &= builder.Eq(propertyName, string.Empty);
                break;
            case FilterOperator.IsNull:
                filter &= builder.Eq(propertyName, NullValue.NullValue);
                break;
            case FilterOperator.IsNotEmpty:
                filter &= builder.Ne(propertyName, string.Empty);
                break;
            case FilterOperator.IsNotNull:
                filter &= builder.Ne(propertyName, NullValue.NullValue);
                break;
        }

        return filter;
    }

    public static FilterDefinition<T>? GetFilter<T>(this PagerSettings pagerSettings, FilterDefinition<T>? filerDefault = null)
    {
        var builder = Builders<T>.Filter;
        var filter = filerDefault ?? builder.Empty;
        if (pagerSettings != null && pagerSettings.Filters.Any())
        {
            foreach (var item in pagerSettings.Filters)
            {
                if (!string.IsNullOrEmpty(item.Property))
                {
                    object? value = GetValueOfFilter(item.FilterValue);
                    if (value != null)
                    {
                        if(item.LogicalFilterOperator == LogicalFilterOperator.And)
                            filter &= GetFilterOperator<T>(item.Property, item.FilterOperator, value);
                        else
                        {
                            filter |= GetFilterOperator<T>(item.Property, item.FilterOperator, value);
                        }
                    }
                }
                if (item.SecondFilterValue != null)
                {
                    object? value = GetValueOfFilter(item.SecondFilterValue);
                    if (value != null)
                    {
                        if(item.LogicalFilterOperator == LogicalFilterOperator.And)
                            filter &= GetFilterOperator<T>(item.Property, item.SecondFilterOperator, value);
                        else
                        {
                            filter |= GetFilterOperator<T>(item.Property, item.SecondFilterOperator, value);
                        }
                    }
                }
            }
        }

        return filter;
    }

    public static SortDefinition<T>? GetSort<T>(this PagerSettings pagerSettings, SortDefinition<T>? sortDefault = null)
    { 
        var sortBuilder = Builders<T>.Sort;
        var sorts = new List<SortDefinition<T>>();
        if (pagerSettings.OrderBy?.Any() == true)
        {
            foreach (var sortItem in pagerSettings.OrderBy)
            {
                SortDefinition<T>? sort = null; 
                if ((sortItem.Value + string.Empty).ToUpper() == "ASC")
                {
                    if (sort == null)
                        sort = sortBuilder.Ascending(sortItem.Key);
                    else
                        sort = sort.Ascending(sortItem.Key);
                }
                else
                {
                    if (sort == null)
                        sort = sortBuilder.Descending(sortItem.Key);
                    else
                        sort = sort.Descending(sortItem.Key);
                }
                sorts.Add(sort);
            } 
        }

        return sorts.Any() ? sortBuilder.Combine(sorts) : sortDefault;
    }
}