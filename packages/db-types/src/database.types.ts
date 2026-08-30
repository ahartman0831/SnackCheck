export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          before_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          request_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          request_id?: string | null
        }
        Relationships: []
      }
      admin_members: {
        Row: {
          active: boolean
          created_at: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      ai_extraction_daily_counters: {
        Row: {
          accepted_count: number
          occurred_on: string
          updated_at: string
        }
        Insert: {
          accepted_count?: number
          occurred_on?: string
          updated_at?: string
        }
        Update: {
          accepted_count?: number
          occurred_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_model_pricing: {
        Row: {
          cached_input_usd_per_million: number | null
          created_at: string
          currency: string
          effective_from: string
          effective_until: string | null
          id: string
          input_usd_per_million: number
          model: string
          output_usd_per_million: number
          provider: string
          source_note: string | null
          source_url: string | null
        }
        Insert: {
          cached_input_usd_per_million?: number | null
          created_at?: string
          currency?: string
          effective_from: string
          effective_until?: string | null
          id?: string
          input_usd_per_million: number
          model: string
          output_usd_per_million: number
          provider: string
          source_note?: string | null
          source_url?: string | null
        }
        Update: {
          cached_input_usd_per_million?: number | null
          created_at?: string
          currency?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          input_usd_per_million?: number
          model?: string
          output_usd_per_million?: number
          provider?: string
          source_note?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      ai_usage_ledger: {
        Row: {
          attempt_ordinal: number
          billed_cost_usd: number | null
          cached_input_tokens: number | null
          cached_input_usd_per_million: number | null
          cost_source: string
          created_at: string
          currency: string
          estimated_input_cost_usd: number | null
          estimated_output_cost_usd: number | null
          estimated_total_cost_usd: number | null
          extraction_attempt_id: string | null
          failure_code: string | null
          id: string
          input_tokens: number | null
          input_usd_per_million: number | null
          is_escalation: boolean
          is_retry: boolean
          latency_ms: number
          model: string
          occurred_at: string
          outcome: string
          output_tokens: number | null
          output_usd_per_million: number | null
          pricing_id: string | null
          prompt_version: string
          provider: string
          provider_request_id: string | null
          reasoning_tokens: number | null
          submission_id: string | null
          token_source: string
          total_tokens: number | null
        }
        Insert: {
          attempt_ordinal: number
          billed_cost_usd?: number | null
          cached_input_tokens?: number | null
          cached_input_usd_per_million?: number | null
          cost_source: string
          created_at?: string
          currency?: string
          estimated_input_cost_usd?: number | null
          estimated_output_cost_usd?: number | null
          estimated_total_cost_usd?: number | null
          extraction_attempt_id?: string | null
          failure_code?: string | null
          id?: string
          input_tokens?: number | null
          input_usd_per_million?: number | null
          is_escalation: boolean
          is_retry: boolean
          latency_ms: number
          model: string
          occurred_at: string
          outcome: string
          output_tokens?: number | null
          output_usd_per_million?: number | null
          pricing_id?: string | null
          prompt_version: string
          provider: string
          provider_request_id?: string | null
          reasoning_tokens?: number | null
          submission_id?: string | null
          token_source: string
          total_tokens?: number | null
        }
        Update: {
          attempt_ordinal?: number
          billed_cost_usd?: number | null
          cached_input_tokens?: number | null
          cached_input_usd_per_million?: number | null
          cost_source?: string
          created_at?: string
          currency?: string
          estimated_input_cost_usd?: number | null
          estimated_output_cost_usd?: number | null
          estimated_total_cost_usd?: number | null
          extraction_attempt_id?: string | null
          failure_code?: string | null
          id?: string
          input_tokens?: number | null
          input_usd_per_million?: number | null
          is_escalation?: boolean
          is_retry?: boolean
          latency_ms?: number
          model?: string
          occurred_at?: string
          outcome?: string
          output_tokens?: number | null
          output_usd_per_million?: number | null
          pricing_id?: string | null
          prompt_version?: string
          provider?: string
          provider_request_id?: string | null
          reasoning_tokens?: number | null
          submission_id?: string | null
          token_source?: string
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_ledger_extraction_attempt_id_fkey"
            columns: ["extraction_attempt_id"]
            isOneToOne: true
            referencedRelation: "extraction_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_ledger_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "ai_model_pricing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_ledger_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "expired_submission_assets"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "ai_usage_ledger_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          anonymous_key_hash: string
          event_name: string
          id: string
          occurred_at: string
          occurred_on: string
          properties: Json
        }
        Insert: {
          anonymous_key_hash: string
          event_name: string
          id?: string
          occurred_at?: string
          occurred_on?: string
          properties?: Json
        }
        Update: {
          anonymous_key_hash?: string
          event_name?: string
          id?: string
          occurred_at?: string
          occurred_on?: string
          properties?: Json
        }
        Relationships: []
      }
      application_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      compliance_evaluations: {
        Row: {
          applicability_status: Database["public"]["Enums"]["applicability_status"]
          context: string
          created_at: string
          engine_version: string
          evaluation_date: string
          explanation_json: Json
          formulation_hash: string
          formulation_id: string
          id: string
          ingredient_status: Database["public"]["Enums"]["ingredient_status"]
          jurisdiction_id: string
          local_policy_status: Database["public"]["Enums"]["local_policy_status"]
          quality_flags: Json
          ruleset_hash: string
          ruleset_id: string
        }
        Insert: {
          applicability_status: Database["public"]["Enums"]["applicability_status"]
          context: string
          created_at?: string
          engine_version: string
          evaluation_date: string
          explanation_json: Json
          formulation_hash: string
          formulation_id: string
          id?: string
          ingredient_status: Database["public"]["Enums"]["ingredient_status"]
          jurisdiction_id: string
          local_policy_status?: Database["public"]["Enums"]["local_policy_status"]
          quality_flags?: Json
          ruleset_hash: string
          ruleset_id: string
        }
        Update: {
          applicability_status?: Database["public"]["Enums"]["applicability_status"]
          context?: string
          created_at?: string
          engine_version?: string
          evaluation_date?: string
          explanation_json?: Json
          formulation_hash?: string
          formulation_id?: string
          id?: string
          ingredient_status?: Database["public"]["Enums"]["ingredient_status"]
          jurisdiction_id?: string
          local_policy_status?: Database["public"]["Enums"]["local_policy_status"]
          quality_flags?: Json
          ruleset_hash?: string
          ruleset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evaluations_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evaluations_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_evaluations_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      data_conflicts: {
        Row: {
          created_at: string
          id: string
          left_formulation_id: string
          notes: string | null
          product_id: string
          resolved_at: string | null
          right_formulation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          left_formulation_id: string
          notes?: string | null
          product_id: string
          resolved_at?: string | null
          right_formulation_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          left_formulation_id?: string
          notes?: string | null
          product_id?: string
          resolved_at?: string | null
          right_formulation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_conflicts_left_formulation_id_fkey"
            columns: ["left_formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_conflicts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_conflicts_right_formulation_id_fkey"
            columns: ["right_formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          created_at: string
          id: string
          jurisdiction_id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction_id: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction_id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: true
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_matches: {
        Row: {
          created_at: string
          evaluation_id: string
          formulation_ingredient_id: string | null
          id: string
          match_mode: Database["public"]["Enums"]["match_mode"]
          matched_alias: string
          normalized_label_value: string
          prohibited_substance_id: string
          raw_label_value: string
          rule_alias_id: string
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          formulation_ingredient_id?: string | null
          id?: string
          match_mode: Database["public"]["Enums"]["match_mode"]
          matched_alias: string
          normalized_label_value: string
          prohibited_substance_id: string
          raw_label_value: string
          rule_alias_id: string
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          formulation_ingredient_id?: string | null
          id?: string
          match_mode?: Database["public"]["Enums"]["match_mode"]
          matched_alias?: string
          normalized_label_value?: string
          prohibited_substance_id?: string
          raw_label_value?: string
          rule_alias_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_matches_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "compliance_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_matches_formulation_ingredient_id_fkey"
            columns: ["formulation_ingredient_id"]
            isOneToOne: false
            referencedRelation: "formulation_ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_matches_prohibited_substance_id_fkey"
            columns: ["prohibited_substance_id"]
            isOneToOne: false
            referencedRelation: "prohibited_substances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_matches_rule_alias_id_fkey"
            columns: ["rule_alias_id"]
            isOneToOne: false
            referencedRelation: "rule_aliases"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_assets: {
        Row: {
          bucket: string
          byte_size: number
          created_at: string
          exif_stripped: boolean
          height: number | null
          id: string
          media_type: string
          retention_until: string | null
          sha256: string
          storage_path: string
          width: number | null
        }
        Insert: {
          bucket: string
          byte_size: number
          created_at?: string
          exif_stripped?: boolean
          height?: number | null
          id?: string
          media_type: string
          retention_until?: string | null
          sha256: string
          storage_path: string
          width?: number | null
        }
        Update: {
          bucket?: string
          byte_size?: number
          created_at?: string
          exif_stripped?: boolean
          height?: number | null
          id?: string
          media_type?: string
          retention_until?: string | null
          sha256?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: []
      }
      extraction_attempts: {
        Row: {
          attempt_ordinal: number
          cached_input_tokens: number | null
          created_at: string
          estimated_cost_usd: number | null
          extraction_json: Json | null
          failure_code: string | null
          id: string
          input_tokens: number | null
          is_escalation: boolean
          is_retry: boolean
          latency_ms: number
          model: string
          outcome: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          provider_request_id: string | null
          reasoning_tokens: number | null
          sanitized_sha256: string
          submission_id: string
        }
        Insert: {
          attempt_ordinal: number
          cached_input_tokens?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          extraction_json?: Json | null
          failure_code?: string | null
          id?: string
          input_tokens?: number | null
          is_escalation?: boolean
          is_retry?: boolean
          latency_ms: number
          model: string
          outcome: string
          output_tokens?: number | null
          prompt_version: string
          provider: string
          provider_request_id?: string | null
          reasoning_tokens?: number | null
          sanitized_sha256: string
          submission_id: string
        }
        Update: {
          attempt_ordinal?: number
          cached_input_tokens?: number | null
          created_at?: string
          estimated_cost_usd?: number | null
          extraction_json?: Json | null
          failure_code?: string | null
          id?: string
          input_tokens?: number | null
          is_escalation?: boolean
          is_retry?: boolean
          latency_ms?: number
          model?: string
          outcome?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          provider_request_id?: string | null
          reasoning_tokens?: number | null
          sanitized_sha256?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_attempts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "expired_submission_assets"
            referencedColumns: ["submission_id"]
          },
          {
            foreignKeyName: "extraction_attempts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      formulation_ingredients: {
        Row: {
          created_at: string
          formulation_id: string
          id: string
          normalized_value: string
          ordinal: number
          parent_ordinal: number | null
          parser_confidence: number | null
          presence_kind: string
          raw_label_value: string
        }
        Insert: {
          created_at?: string
          formulation_id: string
          id?: string
          normalized_value: string
          ordinal: number
          parent_ordinal?: number | null
          parser_confidence?: number | null
          presence_kind?: string
          raw_label_value: string
        }
        Update: {
          created_at?: string
          formulation_id?: string
          id?: string
          normalized_value?: string
          ordinal?: number
          parent_ordinal?: number | null
          parser_confidence?: number | null
          presence_kind?: string
          raw_label_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulation_ingredients_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      formulation_sources: {
        Row: {
          created_at: string
          evidence_asset_id: string | null
          formulation_id: string
          id: string
          observed_at: string
          provenance_json: Json
          source_reference: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          source_url: string | null
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          evidence_asset_id?: string | null
          formulation_id: string
          id?: string
          observed_at: string
          provenance_json?: Json
          source_reference?: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          evidence_asset_id?: string | null
          formulation_id?: string
          id?: string
          observed_at?: string
          provenance_json?: Json
          source_reference?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formulation_sources_evidence_asset_id_fkey"
            columns: ["evidence_asset_id"]
            isOneToOne: false
            referencedRelation: "evidence_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulation_sources_formulation_id_fkey"
            columns: ["formulation_id"]
            isOneToOne: false
            referencedRelation: "formulations"
            referencedColumns: ["id"]
          },
        ]
      }
      formulations: {
        Row: {
          active: boolean
          confidence: number | null
          created_at: string
          created_by: string | null
          first_observed_at: string
          id: string
          ingredient_text_sha256: string
          last_observed_at: string
          last_verified_at: string | null
          normalized_ingredient_text: string
          packaging_notes: string | null
          product_id: string
          raw_ingredients: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          version: number
        }
        Insert: {
          active?: boolean
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          first_observed_at: string
          id?: string
          ingredient_text_sha256: string
          last_observed_at: string
          last_verified_at?: string | null
          normalized_ingredient_text: string
          packaging_notes?: string | null
          product_id: string
          raw_ingredients: string
          updated_at?: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          version: number
        }
        Update: {
          active?: boolean
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          first_observed_at?: string
          id?: string
          ingredient_text_sha256?: string
          last_observed_at?: string
          last_verified_at?: string | null
          normalized_ingredient_text?: string
          packaging_notes?: string | null
          product_id?: string
          raw_ingredients?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "formulations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdictions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          state_code: string | null
          type: Database["public"]["Enums"]["jurisdiction_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          state_code?: string | null
          type: Database["public"]["Enums"]["jurisdiction_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          state_code?: string | null
          type?: Database["public"]["Enums"]["jurisdiction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jurisdictions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      local_policies: {
        Row: {
          created_at: string
          effective_from: string
          effective_until: string | null
          id: string
          jurisdiction_id: string
          policy_type: string
          source_title: string
          source_url: string
          summary: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_until?: string | null
          id?: string
          jurisdiction_id: string
          policy_type: string
          source_title: string
          source_url: string
          summary: string
          updated_at?: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          jurisdiction_id?: string
          policy_type?: string
          source_title?: string
          source_url?: string
          summary?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_policies_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          normalized_alias: string
          product_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          normalized_alias: string
          product_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          normalized_alias?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_aliases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_identifiers: {
        Row: {
          created_at: string
          id: string
          identifier_type: string
          is_primary: boolean
          normalized_gtin14: string
          product_id: string
          raw_value: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier_type: string
          is_primary?: boolean
          normalized_gtin14: string
          product_id: string
          raw_value: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier_type?: string
          is_primary?: boolean
          normalized_gtin14?: string
          product_id?: string
          raw_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_identifiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_redirects: {
        Row: {
          created_at: string
          from_slug: string
          id: string
          to_product_id: string
        }
        Insert: {
          created_at?: string
          from_slug: string
          id?: string
          to_product_id: string
        }
        Update: {
          created_at?: string
          from_slug?: string
          id?: string
          to_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_redirects_to_product_id_fkey"
            columns: ["to_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          brand: string
          category: string | null
          created_at: string
          formulation_conflict: boolean
          gtin14: string | null
          id: string
          image_attribution: string | null
          image_url: string | null
          individually_packaged: boolean | null
          name: string
          primary_upc: string | null
          search_document: string
          size: string | null
          slug: string
          updated_at: string
          variant: string | null
        }
        Insert: {
          active?: boolean
          brand: string
          category?: string | null
          created_at?: string
          formulation_conflict?: boolean
          gtin14?: string | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          individually_packaged?: boolean | null
          name: string
          primary_upc?: string | null
          search_document?: string
          size?: string | null
          slug: string
          updated_at?: string
          variant?: string | null
        }
        Update: {
          active?: boolean
          brand?: string
          category?: string | null
          created_at?: string
          formulation_conflict?: boolean
          gtin14?: string | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          individually_packaged?: boolean | null
          name?: string
          primary_upc?: string | null
          search_document?: string
          size?: string | null
          slug?: string
          updated_at?: string
          variant?: string | null
        }
        Relationships: []
      }
      prohibited_substances: {
        Row: {
          canonical_name: string
          canonical_normalized: string
          created_at: string
          enabled: boolean
          id: string
          regulatory_source_id: string
          ruleset_id: string
          source_locator: string | null
          statutory_ordinal: number
        }
        Insert: {
          canonical_name: string
          canonical_normalized: string
          created_at?: string
          enabled?: boolean
          id?: string
          regulatory_source_id: string
          ruleset_id: string
          source_locator?: string | null
          statutory_ordinal: number
        }
        Update: {
          canonical_name?: string
          canonical_normalized?: string
          created_at?: string
          enabled?: boolean
          id?: string
          regulatory_source_id?: string
          ruleset_id?: string
          source_locator?: string | null
          statutory_ordinal?: number
        }
        Relationships: [
          {
            foreignKeyName: "prohibited_substances_regulatory_source_id_fkey"
            columns: ["regulatory_source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prohibited_substances_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_cache: {
        Row: {
          created_at: string
          expires_at: string
          fetched_at: string
          id: string
          lookup_key: string
          payload: Json
          provider: string
          schema_version: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          fetched_at: string
          id?: string
          lookup_key: string
          payload: Json
          provider: string
          schema_version: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          lookup_key?: string
          payload?: Json
          provider?: string
          schema_version?: string
        }
        Relationships: []
      }
      regulatory_sources: {
        Row: {
          active: boolean
          archived_storage_path: string | null
          citation: string
          content_sha256: string | null
          created_at: string
          id: string
          jurisdiction_id: string
          notes: string | null
          published_at: string | null
          retrieved_at: string
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          archived_storage_path?: string | null
          citation: string
          content_sha256?: string | null
          created_at?: string
          id?: string
          jurisdiction_id: string
          notes?: string | null
          published_at?: string | null
          retrieved_at: string
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          archived_storage_path?: string | null
          citation?: string
          content_sha256?: string | null
          created_at?: string
          id?: string
          jurisdiction_id?: string
          notes?: string | null
          published_at?: string | null
          retrieved_at?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_sources_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_aliases: {
        Row: {
          alias: string
          created_at: string
          enabled: boolean
          id: string
          match_mode: Database["public"]["Enums"]["match_mode"]
          normalized_alias: string
          prohibited_substance_id: string
          regulatory_source_id: string | null
          review_notes: string | null
          review_status: Database["public"]["Enums"]["alias_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          alias: string
          created_at?: string
          enabled?: boolean
          id?: string
          match_mode?: Database["public"]["Enums"]["match_mode"]
          normalized_alias: string
          prohibited_substance_id: string
          regulatory_source_id?: string | null
          review_notes?: string | null
          review_status: Database["public"]["Enums"]["alias_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          enabled?: boolean
          id?: string
          match_mode?: Database["public"]["Enums"]["match_mode"]
          normalized_alias?: string
          prohibited_substance_id?: string
          regulatory_source_id?: string | null
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["alias_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_aliases_prohibited_substance_id_fkey"
            columns: ["prohibited_substance_id"]
            isOneToOne: false
            referencedRelation: "prohibited_substances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_aliases_regulatory_source_id_fkey"
            columns: ["regulatory_source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ruleset_contexts: {
        Row: {
          applicability_status: Database["public"]["Enums"]["applicability_status"]
          context: string
          created_at: string
          enabled: boolean
          id: string
          public_summary: string
          regulatory_source_id: string
          ruleset_id: string
          source_locator: string | null
        }
        Insert: {
          applicability_status: Database["public"]["Enums"]["applicability_status"]
          context: string
          created_at?: string
          enabled?: boolean
          id?: string
          public_summary: string
          regulatory_source_id: string
          ruleset_id: string
          source_locator?: string | null
        }
        Update: {
          applicability_status?: Database["public"]["Enums"]["applicability_status"]
          context?: string
          created_at?: string
          enabled?: boolean
          id?: string
          public_summary?: string
          regulatory_source_id?: string
          ruleset_id?: string
          source_locator?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ruleset_contexts_regulatory_source_id_fkey"
            columns: ["regulatory_source_id"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ruleset_contexts_ruleset_id_fkey"
            columns: ["ruleset_id"]
            isOneToOne: false
            referencedRelation: "rulesets"
            referencedColumns: ["id"]
          },
        ]
      }
      rulesets: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          freshness_aging_days: number
          freshness_current_days: number
          id: string
          is_published: boolean
          jurisdiction_id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          review_document_hash: string | null
          review_document_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          ruleset_hash: string | null
          title: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_until?: string | null
          freshness_aging_days?: number
          freshness_current_days?: number
          id?: string
          is_published?: boolean
          jurisdiction_id: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          review_document_hash?: string | null
          review_document_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          ruleset_hash?: string | null
          title: string
          version: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          freshness_aging_days?: number
          freshness_current_days?: number
          id?: string
          is_published?: boolean
          jurisdiction_id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          review_document_hash?: string | null
          review_document_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          ruleset_hash?: string | null
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rulesets_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_program_participation: {
        Row: {
          created_at: string
          effective_from: string
          effective_until: string | null
          id: string
          participating: boolean
          program: string
          school_id: string
          source_title: string
          source_url: string
          verified_at: string
        }
        Insert: {
          created_at?: string
          effective_from: string
          effective_until?: string | null
          id?: string
          participating: boolean
          program: string
          school_id: string
          source_title: string
          source_url: string
          verified_at: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          participating?: boolean
          program?: string
          school_id?: string
          source_title?: string
          source_url?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_program_participation_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          district_id: string
          id: string
          jurisdiction_id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: string
          id?: string
          jurisdiction_id: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: string
          id?: string
          jurisdiction_id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schools_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: true
            referencedRelation: "jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_daily_counters: {
        Row: {
          accepted_count: number
          occurred_on: string
          updated_at: string
        }
        Insert: {
          accepted_count?: number
          occurred_on?: string
          updated_at?: string
        }
        Update: {
          accepted_count?: number
          occurred_on?: string
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          anonymous_key_hash: string | null
          confirmed_at: string | null
          confirmed_formulation_hash: string | null
          corrected_text: string | null
          created_at: string
          evaluation_result_json: Json | null
          evidence_asset_id: string | null
          extracted_ingredients: Json | null
          extracted_raw_text: string | null
          extraction_confidence: number | null
          extraction_model: string | null
          extraction_provider: string | null
          failure_code: string | null
          failure_detail_safe: string | null
          id: string
          image_sha256: string | null
          normalized_gtin14: string | null
          ownership_revoked_at: string | null
          processing_attempts: number
          processing_started_at: string | null
          product_id: string | null
          prompt_version: string | null
          raw_byte_size: number | null
          raw_object_path: string | null
          raw_sha256: string | null
          retention_until: string | null
          sanitized_at: string | null
          sanitized_byte_size: number | null
          sanitized_height: number | null
          sanitized_media_type: string | null
          sanitized_object_path: string | null
          sanitized_sha256: string | null
          sanitized_width: number | null
          sanitizer_version: string | null
          scanned_identifier: string | null
          status: Database["public"]["Enums"]["submission_status"]
          token_expires_at: string | null
          token_version: number
          updated_at: string
        }
        Insert: {
          anonymous_key_hash?: string | null
          confirmed_at?: string | null
          confirmed_formulation_hash?: string | null
          corrected_text?: string | null
          created_at?: string
          evaluation_result_json?: Json | null
          evidence_asset_id?: string | null
          extracted_ingredients?: Json | null
          extracted_raw_text?: string | null
          extraction_confidence?: number | null
          extraction_model?: string | null
          extraction_provider?: string | null
          failure_code?: string | null
          failure_detail_safe?: string | null
          id?: string
          image_sha256?: string | null
          normalized_gtin14?: string | null
          ownership_revoked_at?: string | null
          processing_attempts?: number
          processing_started_at?: string | null
          product_id?: string | null
          prompt_version?: string | null
          raw_byte_size?: number | null
          raw_object_path?: string | null
          raw_sha256?: string | null
          retention_until?: string | null
          sanitized_at?: string | null
          sanitized_byte_size?: number | null
          sanitized_height?: number | null
          sanitized_media_type?: string | null
          sanitized_object_path?: string | null
          sanitized_sha256?: string | null
          sanitized_width?: number | null
          sanitizer_version?: string | null
          scanned_identifier?: string | null
          status: Database["public"]["Enums"]["submission_status"]
          token_expires_at?: string | null
          token_version?: number
          updated_at?: string
        }
        Update: {
          anonymous_key_hash?: string | null
          confirmed_at?: string | null
          confirmed_formulation_hash?: string | null
          corrected_text?: string | null
          created_at?: string
          evaluation_result_json?: Json | null
          evidence_asset_id?: string | null
          extracted_ingredients?: Json | null
          extracted_raw_text?: string | null
          extraction_confidence?: number | null
          extraction_model?: string | null
          extraction_provider?: string | null
          failure_code?: string | null
          failure_detail_safe?: string | null
          id?: string
          image_sha256?: string | null
          normalized_gtin14?: string | null
          ownership_revoked_at?: string | null
          processing_attempts?: number
          processing_started_at?: string | null
          product_id?: string | null
          prompt_version?: string | null
          raw_byte_size?: number | null
          raw_object_path?: string | null
          raw_sha256?: string | null
          retention_until?: string | null
          sanitized_at?: string | null
          sanitized_byte_size?: number | null
          sanitized_height?: number | null
          sanitized_media_type?: string | null
          sanitized_object_path?: string | null
          sanitized_sha256?: string | null
          sanitized_width?: number | null
          sanitizer_version?: string | null
          scanned_identifier?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          token_expires_at?: string | null
          token_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_evidence_asset_id_fkey"
            columns: ["evidence_asset_id"]
            isOneToOne: false
            referencedRelation: "evidence_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_daily_summary: {
        Row: {
          accepted_calls: number | null
          billed_total_cost_usd: number | null
          cached_input_tokens: number | null
          currency: string | null
          escalation_calls: number | null
          estimated_total_cost_usd: number | null
          input_tokens: number | null
          model: string | null
          occurred_on: string | null
          output_tokens: number | null
          provider: string | null
          provider_calls: number | null
          reasoning_tokens: number | null
          retry_calls: number | null
          total_tokens: number | null
          unpriced_calls: number | null
        }
        Relationships: []
      }
      expired_submission_assets: {
        Row: {
          evidence_asset_id: string | null
          raw_object_path: string | null
          sanitized_object_path: string | null
          submission_id: string | null
        }
        Insert: {
          evidence_asset_id?: string | null
          raw_object_path?: string | null
          sanitized_object_path?: string | null
          submission_id?: string | null
        }
        Update: {
          evidence_asset_id?: string | null
          raw_object_path?: string | null
          sanitized_object_path?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_evidence_asset_id_fkey"
            columns: ["evidence_asset_id"]
            isOneToOne: false
            referencedRelation: "evidence_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_clone_ruleset_to_draft: {
        Args: {
          p_expected_hash: string
          p_request_id: string
          p_source_ruleset_id: string
        }
        Returns: string
      }
      admin_publish_ruleset: {
        Args: {
          p_expected_hash: string
          p_expected_reviewed_at: string
          p_request_id: string
          p_ruleset_id: string
        }
        Returns: Json
      }
      admin_review_ruleset: {
        Args: {
          p_document_hash: string
          p_document_url: string
          p_expected_hash: string
          p_request_id: string
          p_ruleset_id: string
        }
        Returns: Json
      }
      canonical_json: { Args: { value: Json }; Returns: string }
      claim_ai_extraction_slot: { Args: { p_limit: number }; Returns: boolean }
      claim_photo_processing_slot: {
        Args: { p_limit: number }
        Returns: boolean
      }
      clone_ruleset_to_draft: {
        Args: { source_ruleset_id: string }
        Returns: string
      }
      current_published_arizona_ruleset: {
        Args: never
        Returns: {
          freshness_aging_days: number
          freshness_current_days: number
          id: string
          ruleset_hash: string
        }[]
      }
      escape_like_pattern: { Args: { input: string }; Returns: string }
      formulation_freshness_state: {
        Args: {
          aging_days: number
          current_days: number
          last_verified_at: string
        }
        Returns: string
      }
      import_catalog_row: {
        Args: {
          p_brand: string
          p_category: string
          p_gtin14: string
          p_identifier_type: string
          p_ingredient_text_sha256: string
          p_name: string
          p_normalized_ingredient_text: string
          p_notes: string
          p_observed_at: string
          p_primary_upc: string
          p_raw_ingredients: string
          p_size: string
          p_slug: string
          p_source_title: string
          p_source_type: Database["public"]["Enums"]["source_type"]
          p_source_url: string
          p_variant: string
          p_verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Returns: string
      }
      is_active_admin: { Args: { required_roles?: string[] }; Returns: boolean }
      latest_public_formulation_id: {
        Args: { target_product_id: string }
        Returns: string
      }
      list_approved_public_products: {
        Args: {
          filter_brand?: string
          filter_category?: string
          result_limit?: number
          result_offset?: number
        }
        Returns: {
          brand: string
          category: string
          formulation_conflict: boolean
          freshness_state: string
          id: string
          image_attribution: string
          image_url: string
          ingredient_status: Database["public"]["Enums"]["ingredient_status"]
          last_verified_at: string
          name: string
          ruleset_hash: string
          size: string
          slug: string
          variant: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }[]
      }
      list_public_sitemap_entries: {
        Args: never
        Returns: {
          kind: string
          path: string
        }[]
      }
      moderate_submission: {
        Args: {
          p_expected_updated_at: string
          p_next_status: Database["public"]["Enums"]["submission_status"]
          p_request_id: string
          p_submission_id: string
        }
        Returns: Json
      }
      persist_confirmed_submission_evaluation: {
        Args: {
          p_corrected_text: string
          p_evaluation_result: Json
          p_formulation_hash: string
          p_ingredients: Json
          p_normalized_text: string
          p_ruleset_id: string
          p_submission_id: string
        }
        Returns: boolean
      }
      public_product_card: {
        Args: { target_product_id: string }
        Returns: {
          brand: string
          category: string
          formulation_conflict: boolean
          freshness_state: string
          id: string
          image_attribution: string
          image_url: string
          ingredient_status: Database["public"]["Enums"]["ingredient_status"]
          last_verified_at: string
          name: string
          ruleset_hash: string
          size: string
          slug: string
          variant: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }[]
      }
      publish_ruleset: {
        Args: { publisher_id: string; target_ruleset_id: string }
        Returns: undefined
      }
      refresh_product_search_document: {
        Args: { target_product_id: string }
        Returns: undefined
      }
      resolve_formulation_conflict: {
        Args: {
          p_conflict_id: string
          p_decision: string
          p_expected_left_updated_at: string
          p_expected_right_updated_at: string
          p_request_id: string
        }
        Returns: Json
      }
      review_ruleset: {
        Args: {
          document_hash: string
          document_url: string
          reviewer_id: string
          target_ruleset_id: string
        }
        Returns: undefined
      }
      ruleset_canonical_hash: {
        Args: { target_ruleset_id: string }
        Returns: string
      }
      ruleset_canonical_payload: {
        Args: { target_ruleset_id: string }
        Returns: Json
      }
      ruleset_publication_blockers: {
        Args: { target_ruleset_id: string }
        Returns: string[]
      }
      search_products: {
        Args: { query: string; result_limit?: number; result_offset?: number }
        Returns: {
          brand: string
          category: string
          id: string
          image_url: string
          name: string
          rank: number
          similarity: number
          slug: string
          variant: string
        }[]
      }
      search_public_products: {
        Args: {
          cursor_id?: string
          cursor_name?: string
          cursor_rank?: number
          query: string
          result_limit?: number
          result_offset?: number
        }
        Returns: {
          brand: string
          category: string
          formulation_conflict: boolean
          freshness_state: string
          id: string
          image_attribution: string
          image_url: string
          ingredient_status: Database["public"]["Enums"]["ingredient_status"]
          last_verified_at: string
          name: string
          rank: number
          ruleset_hash: string
          similarity: number
          size: string
          slug: string
          variant: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      admin_role: "REVIEWER" | "REGULATORY_ADMIN" | "SUPER_ADMIN"
      alias_review_status:
        | "EXACT_STATUTE_TERM"
        | "AUTHORITATIVE_SYNONYM"
        | "EXPERT_VERIFIED"
        | "PENDING_REVIEW"
        | "REJECTED"
      applicability_status:
        | "APPLIES"
        | "PARENT_OWN_CHILD_EXCEPTION"
        | "OUTSIDE_NORMAL_SCHOOL_DAY"
        | "SCHOOL_NOT_CONFIRMED_PARTICIPATING"
        | "UNKNOWN"
      ingredient_status: "PASS" | "FAIL" | "VERIFY"
      jurisdiction_type: "COUNTRY" | "STATE" | "DISTRICT" | "SCHOOL"
      local_policy_status:
        | "ALLOWED_BY_VERIFIED_POLICY"
        | "RESTRICTED_BY_VERIFIED_POLICY"
        | "NO_VERIFIED_POLICY"
        | "NOT_REQUESTED"
      match_mode: "EXACT_SEGMENT" | "TOKEN_SEQUENCE" | "REVIEWED_REGEX"
      source_type:
        | "STATUTE"
        | "AGENCY_GUIDANCE"
        | "MANUFACTURER"
        | "PACKAGE_PHOTO"
        | "EXTERNAL_DATABASE"
        | "COMMUNITY_SUBMISSION"
        | "ADMIN_ENTRY"
      submission_status:
        | "UPLOAD_PENDING"
        | "UPLOADED"
        | "PROCESSING"
        | "NEEDS_CONFIRMATION"
        | "CONFIRMED"
        | "EVALUATED"
        | "REVIEW_PENDING"
        | "APPROVED"
        | "REJECTED"
        | "FAILED"
        | "SANITIZED"
        | "CANCELLED"
      verification_status:
        | "VERIFIED"
        | "PACKAGE_VERIFIED"
        | "EXTERNAL_DATABASE"
        | "COMMUNITY_SUBMITTED"
        | "STALE"
        | "CONFLICT"
        | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_role: ["REVIEWER", "REGULATORY_ADMIN", "SUPER_ADMIN"],
      alias_review_status: [
        "EXACT_STATUTE_TERM",
        "AUTHORITATIVE_SYNONYM",
        "EXPERT_VERIFIED",
        "PENDING_REVIEW",
        "REJECTED",
      ],
      applicability_status: [
        "APPLIES",
        "PARENT_OWN_CHILD_EXCEPTION",
        "OUTSIDE_NORMAL_SCHOOL_DAY",
        "SCHOOL_NOT_CONFIRMED_PARTICIPATING",
        "UNKNOWN",
      ],
      ingredient_status: ["PASS", "FAIL", "VERIFY"],
      jurisdiction_type: ["COUNTRY", "STATE", "DISTRICT", "SCHOOL"],
      local_policy_status: [
        "ALLOWED_BY_VERIFIED_POLICY",
        "RESTRICTED_BY_VERIFIED_POLICY",
        "NO_VERIFIED_POLICY",
        "NOT_REQUESTED",
      ],
      match_mode: ["EXACT_SEGMENT", "TOKEN_SEQUENCE", "REVIEWED_REGEX"],
      source_type: [
        "STATUTE",
        "AGENCY_GUIDANCE",
        "MANUFACTURER",
        "PACKAGE_PHOTO",
        "EXTERNAL_DATABASE",
        "COMMUNITY_SUBMISSION",
        "ADMIN_ENTRY",
      ],
      submission_status: [
        "UPLOAD_PENDING",
        "UPLOADED",
        "PROCESSING",
        "NEEDS_CONFIRMATION",
        "CONFIRMED",
        "EVALUATED",
        "REVIEW_PENDING",
        "APPROVED",
        "REJECTED",
        "FAILED",
        "SANITIZED",
        "CANCELLED",
      ],
      verification_status: [
        "VERIFIED",
        "PACKAGE_VERIFIED",
        "EXTERNAL_DATABASE",
        "COMMUNITY_SUBMITTED",
        "STALE",
        "CONFLICT",
        "REJECTED",
      ],
    },
  },
} as const
