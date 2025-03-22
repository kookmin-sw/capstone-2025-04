    // BOJ - 13549 숨바꼭질 3

    #include <bits/stdc++.h>
    #define loop(i, s, n) for(ll i = s; i <= n; i++)
    #define LOOP(i, s, n) for(ll i = s; i < n; i++)
    #define ll long long int
    #define MAXN 100001
    
    using namespace std;
    
    // Keypoint: BFS는 항상 가중치가 똑같아야만 쓸 수 있다. 가중치가 하나만 0이다? -> 0/1 BFS
    // 또는 그래프 탐색 문제이기도 하므로, Dijkstra로 풀 수 도 있다.

    int main() {
        ios::sync_with_stdio(false); cin.tie(0);
    
        ll n, k, v[MAXN] = {0, }; cin >> n >> k;

        if(n == k) { cout << "0\n"; return 0; }

        deque<ll> q; q.push_back(n); v[n] = 1;
        while(!q.empty()) {
            ll cur = q.front(); q.pop_front();

            if(cur == k) { cout << (v[cur] - 1) << '\n'; break; }
            if(cur * 2 < MAXN && !v[cur * 2]) v[cur * 2] = v[cur], q.push_front(cur * 2);
            if(cur - 1 >= 0 && !v[cur - 1]) v[cur - 1] = v[cur] + 1, q.push_back(cur - 1);
            if(cur + 1 < MAXN && !v[cur + 1]) v[cur + 1] = v[cur] + 1, q.push_back(cur + 1);
        }

        return 0;
    }