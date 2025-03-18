// BOJ - 2805 나무 자르기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;

ll n, m, max_k = 0;
vector<ll> v;

ll count(ll mid) {
    ll ret = 0;
    for(ll k : v)
        if(k > mid) ret += (k - mid);
    return ret;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n >> m;
    loop(i, 1, n) {
        ll k; cin >> k;
        max_k = max(max_k, k);
        v.push_back(k);
    }

    ll s = 0, e = max_k, ans = 0;
    while(s <= e) {
        ll mid = (s + e) / 2;
        if(count(mid) >= m) {
            ans = mid;
            s = mid + 1;
        }
        else e = mid - 1;
    }
    cout << ans << '\n';
}