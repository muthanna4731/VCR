import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCachedQuery } from '../lib/queryCache'
import { runSupabaseRequest } from '../lib/supabaseRequest'

function mapCity(row) {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    sortOrder: row.sort_order,
  }
}

function mapLayout(row) {
  return {
    id: row.id,
    cityId: row.city_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    layoutImageUrl: row.layout_image_url,
    cardImageUrl: row.card_image_url,
    address: row.address,
    isPublished: row.is_published,
    legalDocUrl: row.legal_doc_url,
  }
}

function mapPlot(row) {
  return {
    id: row.id,
    layoutId: row.layout_id,
    plotNumber: row.plot_number,
    dimensions: row.dimensions,
    dimensionSqft: row.dimension_sqft,
    facing: row.facing,
    status: row.status,
    pricePerSqft: row.price_per_sqft,
    totalPrice: row.total_price,
    cornerPlot: row.corner_plot,
    roadWidth: row.road_width,
    amenities: row.amenities || [],
  }
}

function mapOverlay(row) {
  return {
    id: row.id,
    plotId: row.plot_id,
    layoutId: row.layout_id,
    coordinates: row.coordinates,
    labelPosition: row.label_position,
    plotNumber: row.plots?.plot_number ?? '',
    plotStatus: row.plots?.status ?? 'available',
    plotDimensions: row.plots?.dimensions ?? '',
    plotDimensionSqft: row.plots?.dimension_sqft ?? 0,
    plotFacing: row.plots?.facing ?? '',
    plotPricePerSqft: row.plots?.price_per_sqft ?? 0,
    plotCornerPlot: row.plots?.corner_plot ?? false,
  }
}

/**
 * Fetches a single published layout by slug, its city, all its plots,
 * plot overlays, and payment data for negotiation/sold/booked plots.
 */
export default function usePlots(slug) {
  const [layout, setLayout] = useState(null)
  const [city, setCity] = useState(null)
  const [plots, setPlots] = useState([])
  const [overlays, setOverlays] = useState([])
  const [paymentData, setPaymentData] = useState({}) // keyed by plot_id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setLayout(null)
      setCity(null)
      setPlots([])
      setOverlays([])
        setPaymentData({})

      try {
        const data = await getCachedQuery(`plots:${slug}`, async () => {
          let layoutRes
          try {
            layoutRes = await runSupabaseRequest(
              () => supabase
                .from('site_layouts')
                .select('id, city_id, name, slug, description, layout_image_url, card_image_url, address, is_published, legal_doc_url')
                .eq('slug', slug)
                .eq('is_published', true)
                .single(),
              { label: `Load layout ${slug}` }
            )
          } catch (error) {
            if (error?.code === 'PGRST116') {
              return {
                layout: null,
                city: null,
                plots: [],
                overlays: [],
                paymentData: {},
              }
            }
            throw error
          }

          const mappedLayout = mapLayout(layoutRes.data)

          const [cityRes, plotsRes, overlaysRes] = await Promise.all([
            runSupabaseRequest(
              () => supabase.from('cities').select('id, name, state, sort_order').eq('id', mappedLayout.cityId).single(),
              { label: 'Load layout city' }
            ),
            runSupabaseRequest(
              () => supabase
                .from('plots')
                .select('id, layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities')
                .eq('layout_id', mappedLayout.id)
                .order('plot_number'),
              { label: 'Load layout plots' }
            ),
            runSupabaseRequest(
              () => supabase
                .from('plot_overlays')
                .select('id, plot_id, layout_id, coordinates, label_position, plots(plot_number, status, dimensions, dimension_sqft, facing, price_per_sqft, corner_plot)')
                .eq('layout_id', mappedLayout.id),
              { label: 'Load plot overlays' }
            ),
          ])

          const mappedPlots = plotsRes.data.map(mapPlot)
          const mappedOverlays = (overlaysRes.data ?? []).map(mapOverlay)

          const paidPlotIds = mappedPlots
            .filter(plot => ['negotiation', 'booked', 'sold'].includes(plot.status))
            .map(plot => plot.id)

          const payMap = {}
          if (paidPlotIds.length > 0) {
            const { data: planData } = await runSupabaseRequest(
              () => supabase
                .from('payment_plans')
                .select('plot_id, buyer_name, buyer_phone, total_amount, id')
                .in('plot_id', paidPlotIds),
              { label: 'Load payment plans for plots' }
            )

            if (planData && planData.length > 0) {
              const planIds = planData.map(plan => plan.id)
              const { data: instData } = await runSupabaseRequest(
                () => supabase
                  .from('payment_installments')
                  .select('plan_id, status, amount')
                  .in('plan_id', planIds),
                { label: 'Load payment installments for plots' }
              )

              const instSummary = {}
              for (const inst of (instData ?? [])) {
                if (!instSummary[inst.plan_id]) instSummary[inst.plan_id] = { total: 0, paid: 0, totalAmt: 0, paidAmt: 0 }
                instSummary[inst.plan_id].total++
                instSummary[inst.plan_id].totalAmt += Number(inst.amount)
                if (inst.status === 'paid') {
                  instSummary[inst.plan_id].paid++
                  instSummary[inst.plan_id].paidAmt += Number(inst.amount)
                }
              }

              for (const plan of planData) {
                payMap[plan.plot_id] = {
                  buyerName: plan.buyer_name,
                  buyerPhone: plan.buyer_phone,
                  totalAmount: plan.total_amount,
                  planId: plan.id,
                  summary: instSummary[plan.id] ?? null,
                }
              }
            }
          }

          return {
            layout: mappedLayout,
            city: mapCity(cityRes.data),
            plots: mappedPlots,
            overlays: mappedOverlays,
            paymentData: payMap,
          }
        })

        if (cancelled) return

        setLayout(data.layout)
        setCity(data.city)
        setPlots(data.plots)
        setOverlays(data.overlays)
        setPaymentData(data.paymentData)
      } catch (err) {
        if (cancelled) return
        setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [slug])

  return { layout, city, plots, overlays, paymentData, loading, error }
}
