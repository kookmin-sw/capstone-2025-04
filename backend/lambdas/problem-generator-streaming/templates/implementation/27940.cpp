// BOJ - 27940 가지 산사태

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXM 1000001
#define MAXN 100001
 
using namespace std;
 
ll t[MAXM], r[MAXM];
ll arr[MAXN];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, m, k; cin >> n >> m >> k;
    loop(i, 1, m) {
        ll _t, _r; cin >> _t >> _r;
        t[i] = _t; r[i] = _r;
    }

    loop(i, 1, m) {
        loop(j, 1, 1) {
            arr[j] += r[i];
            if(arr[j] > k) {
                cout << i << ' ' << j << '\n';
                return 0;
            }
        }
    }

    cout << "-1\n";
    return 0;
}