import { useMemo } from 'react'
import '../css/properties.css'
import useFilters from '../hooks/useFilters'
import useProperties from '../hooks/useProperties'
import FilterBar from '../components/properties/FilterBar'
import CitySection from '../components/properties/CitySection'

export default function PropertiesPage() {
  const [filters, setFilters] = useFilters()
  const { cities, layouts, loading, error } = useProperties()

  const filteredData = useMemo(() => {
    let matchingLayouts = layouts // already filtered to is_published by the hook

    if (filters.city) {
      const cityObj = cities.find(c => c.name === filters.city)
      if (cityObj) {
        matchingLayouts = matchingLayouts.filter(l => l.cityId === cityObj.id)
      }
    }

    const grouped = []
    for (const city of cities) {
      const cityLayouts = matchingLayouts.filter(l => l.cityId === city.id)
      if (cityLayouts.length > 0) {
        grouped.push({ city, layouts: cityLayouts })
      }
    }
    return grouped
  }, [filters.city, cities, layouts])

  const filterOptions = useMemo(() => ({
    city: cities.map(c => c.name),
  }), [cities])

  if (loading) {
    return (
      <div className="prop-page">
        <div className="container-container">
          <div className="prop-empty">
            <div className="prop-empty-title">Loading properties…</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="prop-page">
        <div className="container-container">
          <div className="prop-empty">
            <div className="prop-empty-title">Failed to load properties</div>
            <div className="prop-empty-text">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="prop-page">
      <div className="container-container">
        <h1 className="prop-page-title">Explore Our Properties</h1>
        <p className="prop-page-subtitle">
          Premium plots across Karnataka — Vastu-compliant, gated communities
        </p>

        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          options={filterOptions}
          showCopyLink={false}
        />

        {filteredData.length > 0 ? (
          filteredData.map(({ city, layouts }) => (
            <CitySection key={city.id} city={city} layouts={layouts} />
          ))
        ) : (
          <div className="prop-empty">
            <div className="prop-empty-title">No layouts match your filters</div>
            <div className="prop-empty-text">Try adjusting your search criteria</div>
          </div>
        )}
      </div>
    </div>
  )
}
